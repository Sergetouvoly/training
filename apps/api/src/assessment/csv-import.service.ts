import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-1.6 — Admin: import banque items CSV

const VALID_FORMATS = new Set(["qcm_single", "qcm_multi", "true_false"]);

export interface CsvImportResult {
  imported: number;
  errors: string[];
}

interface ParsedRow {
  bank_id: string;
  format: string;
  difficulty: number;
  bloom_level: number;
  concept_tags: string[];
  content: Record<string, unknown>;
}

@Injectable()
export class CsvImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCsv(csvText: string): Promise<CsvImportResult> {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) throw new BadRequestException("CSV must have a header and at least one data row");

    const headers = parseCsvLine(lines[0]);
    const errors: string[] = [];
    const validRows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((h, idx) => [h.trim(), cols[idx]?.trim() ?? ""]));

      const rowErrors = validateRow(row, rowNum);
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      const content: Record<string, unknown> = { question_fr: row["question_fr"] };
      if (row["question_en"]) content["question_en"] = row["question_en"];
      if (row["correct_answer"]) content["correct_answer"] = row["correct_answer"];
      if (row["choices_json"]) {
        try {
          content["choices"] = JSON.parse(row["choices_json"]);
        } catch {
          errors.push(`Row ${rowNum}: invalid choices_json (not valid JSON)`);
          continue;
        }
      }

      validRows.push({
        bank_id: row["bank_id"],
        format: row["format"],
        difficulty: Number.parseInt(row["difficulty"], 10),
        bloom_level: Number.parseInt(row["bloom_level"], 10),
        concept_tags: row["concept_tags"] ? row["concept_tags"].split(",").map((t) => t.trim()).filter(Boolean) : [],
        content,
      });
    }

    if (validRows.length === 0) {
      return { imported: 0, errors };
    }

    const result = await this.prisma.evaluationItem.createMany({ data: validRows as any[] });
    return { imported: result.count, errors };
  }
}

function validateRow(row: Record<string, string>, rowNum: number): string[] {
  const errors: string[] = [];

  if (!row["bank_id"]) errors.push(`Row ${rowNum}: missing bank_id`);
  if (!VALID_FORMATS.has(row["format"])) {
    errors.push(`Row ${rowNum}: invalid format "${row["format"]}" — must be qcm_single | qcm_multi | true_false`);
  }

  const diff = Number.parseInt(row["difficulty"], 10);
  if (Number.isNaN(diff) || diff < 1 || diff > 5) {
    errors.push(`Row ${rowNum}: difficulty must be 1-5, got "${row["difficulty"]}"`);
  }

  const bloom = Number.parseInt(row["bloom_level"], 10);
  if (Number.isNaN(bloom) || bloom < 1 || bloom > 6) {
    errors.push(`Row ${rowNum}: bloom_level must be 1-6, got "${row["bloom_level"]}"`);
  }

  if (!row["question_fr"]) errors.push(`Row ${rowNum}: missing question_fr`);

  return errors;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      ({ current, i, inQuotes } = handleQuote(line, current, i, inQuotes));
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      i++;
    } else {
      current += ch;
      i++;
    }
  }
  result.push(current);
  return result;
}

function handleQuote(
  line: string,
  current: string,
  i: number,
  inQuotes: boolean,
): { current: string; i: number; inQuotes: boolean } {
  if (inQuotes && line[i + 1] === '"') {
    return { current: current + '"', i: i + 2, inQuotes };
  }
  return { current, i: i + 1, inQuotes: !inQuotes };
}
