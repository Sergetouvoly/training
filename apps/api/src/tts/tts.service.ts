// Refs: dev_idea.txt — synthèse vocale d'un module via microservice Python supertonic
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import { LearningService } from "../learning/learning.service.js";

const TTS_URL = process.env["TTS_URL"] ?? "http://localhost:3002";
const TTS_SECRET = process.env["TTS_SHARED_SECRET"] ?? "";
// 5 min max — la synthèse longue peut prendre du temps sur CPU
const TTS_TIMEOUT_MS = Number(process.env["TTS_TIMEOUT_MS"] ?? 5 * 60 * 1000);

export type TtsLang = "fr" | "en" | "ko" | "ja";

export interface GenerateAudioDto {
  readonly lang?: TtsLang;
  readonly voice?: string;
  readonly replace?: boolean;
}

export interface GenerateAudioResult {
  readonly url: string;
  readonly duration_seconds: number;
  readonly size_bytes: number;
  readonly text_length: number;
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly learningService: LearningService,
  ) {}

  // Vérifie que le microservice TTS est joignable. Utilisé par l'UI avant d'afficher
  // le formulaire de génération, et avant chaque lancement pour éviter les attentes inutiles.
  async checkHealth(): Promise<{ available: boolean; reason?: string; model_loaded?: boolean }> {
    if (!TTS_SECRET) {
      return { available: false, reason: "TTS_SHARED_SECRET non configuré côté serveur" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`${TTS_URL}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return { available: false, reason: `TTS répond avec ${res.status}` };
      const data = (await res.json().catch(() => ({}))) as { model_loaded?: boolean };
      return { available: true, model_loaded: data.model_loaded };
    } catch (e: any) {
      clearTimeout(timer);
      const reason = e?.name === "AbortError"
        ? "TTS injoignable (timeout)"
        : `TTS injoignable : ${e?.message ?? "erreur réseau"}`;
      return { available: false, reason };
    }
  }

  async generateForModule(moduleId: string, dto: GenerateAudioDto): Promise<GenerateAudioResult> {
    if (!TTS_SECRET) {
      throw new InternalServerErrorException("TTS_SHARED_SECRET is not configured");
    }

    // 1. Charger le module
    const mod = await this.learningService.findModuleById(moduleId);
    const content = mod.content_fr as any;
    if (!content || !Array.isArray(content.lessons)) {
      throw new BadRequestException("Module has no content");
    }

    // 2. Si audio existe et replace=false → erreur
    if (content.audio_summary_url && dto.replace !== true) {
      throw new BadRequestException("Module already has an audio summary; pass replace=true to overwrite");
    }

    // 3. Extraire le texte
    const text = extractText(content.lessons);
    if (!text.trim()) {
      throw new BadRequestException("Module contains no readable text");
    }
    if (text.length > 50000) {
      throw new BadRequestException(`Text too long: ${text.length} chars (max 50000)`);
    }

    this.logger.log(`Synthèse module ${moduleId} : ${text.length} chars, lang=${dto.lang ?? "fr"}, voice=${dto.voice ?? "M1"}`);

    // 4. Appeler le service TTS
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${TTS_URL}/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shared-Secret": TTS_SECRET,
        },
        body: JSON.stringify({
          text,
          lang: dto.lang ?? "fr",
          voice: dto.voice ?? "M1",
        }),
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timer);
      if (e?.name === "AbortError") {
        throw new InternalServerErrorException(`TTS timeout after ${TTS_TIMEOUT_MS}ms`);
      }
      throw new InternalServerErrorException(`TTS unreachable: ${e?.message ?? "unknown"}`);
    }
    clearTimeout(timer);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new InternalServerErrorException(`TTS service returned ${response.status}: ${detail}`);
    }

    const mp3Buffer = Buffer.from(await response.arrayBuffer());
    const durationHeader = response.headers.get("X-Duration-Seconds");
    const durationSeconds = durationHeader ? Number.parseFloat(durationHeader) : 0;

    // 5. Upload via MediaService — on construit un faux Multer.File
    const fileLike: Express.Multer.File = {
      buffer: mp3Buffer,
      mimetype: "audio/mpeg",
      originalname: `tts-${Date.now()}.mp3`,
      size: mp3Buffer.length,
      fieldname: "file",
      encoding: "7bit",
      stream: undefined as any,
      destination: "",
      filename: "",
      path: "",
    };
    const uploaded = this.mediaService.upload(moduleId, fileLike);

    // 6. Mettre à jour le contenu du module
    const nextContent = {
      ...content,
      audio_summary_url: uploaded.url,
    };
    await this.prisma.module.update({
      where: { id: moduleId },
      data: { content_fr: nextContent },
    });

    this.logger.log(`Audio généré : ${uploaded.url} (${durationSeconds.toFixed(1)}s, ${(uploaded.size_bytes / 1024).toFixed(0)} Ko)`);

    return {
      url: uploaded.url,
      duration_seconds: durationSeconds,
      size_bytes: uploaded.size_bytes,
      text_length: text.length,
    };
  }

  // Endpoint helper : aperçu du texte extrait + sa longueur
  async previewText(moduleId: string): Promise<{ text: string; length: number; has_audio: boolean }> {
    const mod = await this.learningService.findModuleById(moduleId);
    const content = mod.content_fr as any;
    if (!content) throw new NotFoundException("Module has no content");
    const text = extractText(content.lessons ?? []);
    return { text, length: text.length, has_audio: Boolean(content.audio_summary_url) };
  }
}

// ── Extraction du texte brut depuis les blocs ────────────────────────────────
// On ignore : image, video, audio, file, quiz, scenario, key_takeaway,
// shape, callout, video_embed, code, table, divider, mini_quiz

const READABLE_BLOCK_TYPES = new Set(["paragraph", "heading", "bullet_list", "ordered_list", "blockquote"]);

function inlineToText(items: any[]): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((it) => {
      if (typeof it === "string") return it;
      if (it?.type === "text") return it.text ?? "";
      if (it?.type === "link") return it.text ?? "";
      return "";
    })
    .join("");
}

function blockToText(block: any): string {
  if (!block || !READABLE_BLOCK_TYPES.has(block.type)) return "";

  switch (block.type) {
    case "paragraph":
    case "heading":
    case "blockquote":
      return inlineToText(block.content);
    case "bullet_list":
    case "ordered_list":
      return (block.items ?? [])
        .map((item: any[]) => inlineToText(item))
        .filter(Boolean)
        .join(". ");
    default:
      return "";
  }
}

function extractText(lessons: any[]): string {
  if (!Array.isArray(lessons)) return "";
  const parts: string[] = [];
  for (const lesson of lessons) {
    if (lesson?.title_fr) parts.push(lesson.title_fr);
    for (const block of lesson?.blocks ?? []) {
      const t = blockToText(block).trim();
      if (t) parts.push(t);
    }
  }
  // Sépare par point + espace pour donner au TTS des pauses naturelles
  return parts
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(". ")
    .replace(/\.\.+/g, ".");
}
