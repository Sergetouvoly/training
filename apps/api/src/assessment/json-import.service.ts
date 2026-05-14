import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-1.6 — import banque items JSON
// Format attendu :
// {
//   "bank_id": "bank-001",
//   "items": [{
//     "format": "qcm_single",           // qcm_single | qcm_multi | true_false
//     "difficulty": 2,                   // 1-5
//     "bloom_level": 3,                  // 1-6
//     "concept_tags": ["tag1", "tag2"],
//     "question_fr": "...",
//     "question_en": "...",              // optionnel
//     "choices": [                       // optionnel
//       { "label": "A", "is_correct": true },
//       { "label": "B", "is_correct": false }
//     ],
//     "correct_answer": "true"           // optionnel (true_false)
//   }]
// }

const VALID_FORMATS = new Set(["qcm_single", "qcm_multi", "true_false"]);

export interface JsonImportResult {
  imported: number;
  errors: string[];
}

@Injectable()
export class JsonImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importJson(raw: string): Promise<JsonImportResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException("Invalid JSON");
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new BadRequestException("JSON must be an object");
    }

    const doc = parsed as Record<string, unknown>;
    const bankId = doc["bank_id"];
    if (!bankId || typeof bankId !== "string") {
      throw new BadRequestException("Missing or invalid bank_id at root");
    }

    const items = doc["items"];
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException("items must be a non-empty array");
    }

    const errors: string[] = [];
    const validRows: {
      bank_id: string;
      format: string;
      difficulty: number;
      bloom_level: number;
      concept_tags: string[];
      content: Record<string, unknown>;
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Record<string, unknown>;
      const idx = i + 1;

      if (!item || typeof item !== "object") {
        errors.push(`Item ${idx}: not an object`);
        continue;
      }

      const rowErrors: string[] = [];

      if (!VALID_FORMATS.has(item["format"] as string)) {
        rowErrors.push(`Item ${idx}: invalid format "${item["format"]}" — must be qcm_single | qcm_multi | true_false`);
      }

      const diff = Number(item["difficulty"]);
      if (!Number.isInteger(diff) || diff < 1 || diff > 5) {
        rowErrors.push(`Item ${idx}: difficulty must be 1-5, got "${item["difficulty"]}"`);
      }

      const bloom = Number(item["bloom_level"]);
      if (!Number.isInteger(bloom) || bloom < 1 || bloom > 6) {
        rowErrors.push(`Item ${idx}: bloom_level must be 1-6, got "${item["bloom_level"]}"`);
      }

      if (!item["question_fr"] || typeof item["question_fr"] !== "string") {
        rowErrors.push(`Item ${idx}: missing question_fr`);
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      const content: Record<string, unknown> = { question_fr: item["question_fr"] };
      if (item["question_en"]) content["question_en"] = item["question_en"];
      if (item["correct_answer"] !== undefined) content["correct_answer"] = item["correct_answer"];
      if (Array.isArray(item["choices"])) content["choices"] = item["choices"];

      const tags = Array.isArray(item["concept_tags"])
        ? (item["concept_tags"] as unknown[]).filter((t): t is string => typeof t === "string")
        : [];

      validRows.push({
        bank_id: bankId,
        format: item["format"] as string,
        difficulty: diff,
        bloom_level: bloom,
        concept_tags: tags,
        content,
      });
    }

    if (validRows.length === 0) return { imported: 0, errors };

    const result = await this.prisma.evaluationItem.createMany({ data: validRows as any[] });
    return { imported: result.count, errors };
  }
}
