// Refs: SPEC-CONTENT.md §3.1 — upload media local (dev), S3-ready (ADR requis pour migration)
import { Injectable, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const UPLOAD_ROOT = process.env["UPLOAD_DIR"] ?? join(process.cwd(), "uploads");

// Extensions exécutables interdites
const BLOCKED_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".exe", ".sh", ".bat", ".cmd", ".php", ".py", ".rb", ".pl"]);

// Limites par catégorie (bytes)
const SIZE_LIMITS: Record<MediaCategory, number> = {
  image: 10 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  file:  50  * 1024 * 1024,
};

const MIME_CATEGORIES: Record<string, MediaCategory> = {
  "image/jpeg": "image", "image/png": "image", "image/gif": "image",
  "image/webp": "image", "image/svg+xml": "image",
  "audio/mpeg": "audio", "audio/mp3": "audio", "audio/wav": "audio",
  "audio/ogg": "audio", "audio/aac": "audio", "audio/m4a": "audio",
  "audio/mp4": "audio",
  "video/mp4": "video", "video/webm": "video", "video/ogg": "video",
  "video/quicktime": "video", "video/x-msvideo": "video",
  "application/pdf": "file",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "file",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "file",
  "application/zip": "file",
};

export type MediaCategory = "image" | "audio" | "video" | "file";

export interface UploadedMedia {
  url: string;
  filename: string;
  mime: string;
  size_bytes: number;
  category: MediaCategory;
}

@Injectable()
export class MediaService {
  upload(moduleId: string, file: Express.Multer.File): UploadedMedia {
    const ext = extname(file.originalname).toLowerCase();

    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`Extension ${ext} non autorisée`);
    }

    const mime = file.mimetype;
    const category: MediaCategory = MIME_CATEGORIES[mime] ?? "file";
    const limit = SIZE_LIMITS[category];

    if (file.size > limit) {
      throw new BadRequestException(
        `Fichier trop volumineux : max ${limit / 1024 / 1024} MB pour ${category}`
      );
    }

    const uuid = randomUUID();
    const safeFilename = `${uuid}${ext}`;
    const dir = join(UPLOAD_ROOT, moduleId);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(join(dir, safeFilename), file.buffer);

    return {
      url: `/media/${moduleId}/${safeFilename}`,
      filename: file.originalname,
      mime,
      size_bytes: file.size,
      category,
    };
  }
}
