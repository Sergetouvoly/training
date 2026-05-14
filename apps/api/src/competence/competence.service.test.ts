import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { CompetenceService } from "./competence.service.js";

// Refs: SPEC.md §7 — CRUD competences (admin + super_admin)

function makePrismaStub() {
  return {
    competence: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as any;
}

const sample = { id: "c1", code: "RGPD-01", label_fr: "RGPD bases", label_en: "GDPR basics", created_at: new Date() };

describe("CompetenceService", () => {
  let service: CompetenceService;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    service = new CompetenceService(prisma);
  });

  it("listAll returns all competences ordered by code", async () => {
    prisma.competence.findMany.mockResolvedValue([sample]);
    const result = await service.listAll();
    expect(result).toHaveLength(1);
    expect(prisma.competence.findMany).toHaveBeenCalledWith({ where: { deleted_at: null }, orderBy: { code: "asc" } });
  });

  it("findById returns competence", async () => {
    prisma.competence.findFirst.mockResolvedValue(sample);
    const result = await service.findById("c1");
    expect(result.code).toBe("RGPD-01");
  });

  it("findById throws NotFoundException for unknown id", async () => {
    prisma.competence.findFirst.mockResolvedValue(null);
    await expect(service.findById("nope")).rejects.toThrow(NotFoundException);
  });

  it("create inserts new competence", async () => {
    prisma.competence.findFirst.mockResolvedValue(null); // code not taken
    prisma.competence.create.mockResolvedValue(sample);

    const result = await service.create({ code: "RGPD-01", label_fr: "RGPD bases", label_en: "GDPR basics" });
    expect(result.code).toBe("RGPD-01");
    expect(prisma.competence.create).toHaveBeenCalledWith({
      data: { code: "RGPD-01", label_fr: "RGPD bases", label_en: "GDPR basics" },
    });
  });

  it("create throws ConflictException if code already exists", async () => {
    prisma.competence.findFirst.mockResolvedValue(sample);
    await expect(
      service.create({ code: "RGPD-01", label_fr: "RGPD bases", label_en: "GDPR basics" }),
    ).rejects.toThrow(ConflictException);
  });

  it("update patches label fields", async () => {
    prisma.competence.findFirst.mockResolvedValue(sample);
    prisma.competence.update.mockResolvedValue({ ...sample, label_fr: "RGPD avancé" });

    const result = await service.update("c1", { label_fr: "RGPD avancé" });
    expect(result.label_fr).toBe("RGPD avancé");
    expect(prisma.competence.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { label_fr: "RGPD avancé" },
    });
  });

  it("update throws NotFoundException for unknown id", async () => {
    prisma.competence.findFirst.mockResolvedValue(null);
    await expect(service.update("nope", { label_fr: "X" })).rejects.toThrow(NotFoundException);
  });

  it("remove soft-deletes competence", async () => {
    prisma.competence.findFirst.mockResolvedValue(sample);
    prisma.competence.update.mockResolvedValue(sample);

    await service.remove("c1");
    const call = prisma.competence.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "c1" });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });

  it("remove throws NotFoundException for unknown id", async () => {
    prisma.competence.findFirst.mockResolvedValue(null);
    await expect(service.remove("nope")).rejects.toThrow(NotFoundException);
  });
});
