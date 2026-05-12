// Refs: SPEC.md §9 US-1.6 — Admin: import banque items CSV
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CsvImportService } from "./csv-import.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const makePrisma = () =>
  ({
    evaluationItem: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  }) as unknown as PrismaService;

const validCsv = `bank_id,format,difficulty,bloom_level,concept_tags,question_fr,correct_answer
bank-1,true_false,2,1,"securite,rgpd",Le RGPD s'applique aux données personnelles,true
bank-1,qcm_single,3,2,"securite",Quelle est la durée maximale de conservation RGPD?,5 ans`;

const csvWithChoices = `bank_id,format,difficulty,bloom_level,concept_tags,question_fr,choices_json
bank-1,qcm_single,2,2,"securite",Quel article du RGPD traite du droit à l'oubli?,"[{""label"":""Art. 17"",""is_correct"":true},{""label"":""Art. 5"",""is_correct"":false}]"`;

describe("CsvImportService", () => {
  let prisma: PrismaService;
  let service: CsvImportService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CsvImportService(prisma);
  });

  it("parses valid CSV and creates items via Prisma", async () => {
    (prisma.evaluationItem.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

    const result = await service.importCsv(validCsv);

    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);

    const data = (prisma.evaluationItem.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0].format).toBe("true_false");
    expect(data[0].bank_id).toBe("bank-1");
  });

  it("parses choices_json column for qcm items", async () => {
    (prisma.evaluationItem.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const result = await service.importCsv(csvWithChoices);

    expect(result.imported).toBe(1);
    const data = (prisma.evaluationItem.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect((data[0].content as any).choices).toHaveLength(2);
    expect((data[0].content as any).choices[0].is_correct).toBe(true);
  });

  it("rejects rows with invalid format and returns errors", async () => {
    const badCsv = `bank_id,format,difficulty,bloom_level,concept_tags,question_fr
bank-1,video_branched,2,1,"securite",Question invalide`;

    const result = await service.importCsv(badCsv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/format/i);
  });

  it("rejects rows with difficulty out of range 1-5", async () => {
    const badCsv = `bank_id,format,difficulty,bloom_level,concept_tags,question_fr
bank-1,true_false,9,1,"securite",Question invalide`;

    const result = await service.importCsv(badCsv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/difficulty/i);
  });

  it("returns 0 imported and skips createMany when all rows are invalid", async () => {
    const allBadCsv = `bank_id,format,difficulty,bloom_level,concept_tags,question_fr
bank-1,unknown_format,9,9,"",`;

    const result = await service.importCsv(allBadCsv);

    expect(result.imported).toBe(0);
    expect(prisma.evaluationItem.createMany).not.toHaveBeenCalled();
  });
});
