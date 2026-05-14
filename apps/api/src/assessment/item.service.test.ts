import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ItemService } from "./item.service.js";

// Refs: SPEC.md §3 L2, R-1.2

function makePrismaStub() {
  return {
    evaluationItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as any;
}

const sampleContent = {
  question_fr: "Qu'est-ce que le RGPD ?",
  choices: [
    { label: "A", is_correct: true },
    { label: "B", is_correct: false },
  ],
};

describe("ItemService", () => {
  let service: ItemService;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    service = new ItemService(prisma);
  });

  it("creates an item", async () => {
    prisma.evaluationItem.create.mockResolvedValue({ id: "i1" });

    await service.create({
      bank_id: "bank-1",
      format: "qcm_single",
      difficulty: 3,
      bloom_level: 2,
      concept_tags: ["rgpd"],
      content: sampleContent,
    });

    expect(prisma.evaluationItem.create).toHaveBeenCalledWith({
      data: {
        bank_id: "bank-1",
        format: "qcm_single",
        difficulty: 3,
        bloom_level: 2,
        concept_tags: ["rgpd"],
        content: sampleContent,
      },
    });
  });

  it("finds item by id", async () => {
    prisma.evaluationItem.findFirst.mockResolvedValue({ id: "i1" });
    const result = await service.findById("i1");
    expect(result.id).toBe("i1");
    expect(prisma.evaluationItem.findFirst).toHaveBeenCalledWith({ where: { id: "i1", deleted_at: null } });
  });

  it("throws NotFoundException for unknown item", async () => {
    prisma.evaluationItem.findFirst.mockResolvedValue(null);
    await expect(service.findById("nope")).rejects.toThrow(NotFoundException);
  });

  it("lists items by bank", async () => {
    prisma.evaluationItem.findMany.mockResolvedValue([]);
    await service.listByBank("bank-1");
    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith({ where: { bank_id: "bank-1", deleted_at: null } });
  });

  it("draws stratified items across difficulty levels (R-1.2)", async () => {
    const items = [
      { id: "i1", difficulty: 1, bank_id: "b1" },
      { id: "i2", difficulty: 1, bank_id: "b1" },
      { id: "i3", difficulty: 2, bank_id: "b1" },
      { id: "i4", difficulty: 3, bank_id: "b1" },
      { id: "i5", difficulty: 3, bank_id: "b1" },
      { id: "i6", difficulty: 4, bank_id: "b1" },
    ];
    prisma.evaluationItem.findMany.mockResolvedValue(items);

    const drawn = await service.drawStratified({ bank_id: "b1", count: 4 });

    expect(drawn.length).toBe(4);
    const diffs = new Set(drawn.map((d: any) => d.difficulty));
    expect(diffs.size).toBeGreaterThan(1);
  });

  it("returns empty array when no items in bank", async () => {
    prisma.evaluationItem.findMany.mockResolvedValue([]);
    const drawn = await service.drawStratified({ bank_id: "b1", count: 5 });
    expect(drawn).toEqual([]);
  });

  // ─── listAll ───────────────────────────────────────────

  it("listAll returns all items ordered by created_at desc", async () => {
    prisma.evaluationItem.findMany.mockResolvedValue([{ id: "i1" }, { id: "i2" }]);
    const result = await service.listAll();
    expect(result).toHaveLength(2);
    expect(prisma.evaluationItem.findMany).toHaveBeenCalledWith({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
    });
  });

  // ─── updateItem ────────────────────────────────────────

  it("updateItem patches provided fields", async () => {
    prisma.evaluationItem.findFirst.mockResolvedValue({ id: "i1" });
    prisma.evaluationItem.update.mockResolvedValue({ id: "i1", difficulty: 4 });

    const result = await service.update("i1", { difficulty: 4 });
    expect(result.difficulty).toBe(4);
    expect(prisma.evaluationItem.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { difficulty: 4 },
    });
  });

  it("updateItem throws NotFoundException for unknown item", async () => {
    prisma.evaluationItem.findFirst.mockResolvedValue(null);
    await expect(service.update("nope", { difficulty: 2 })).rejects.toThrow(NotFoundException);
  });

  // ─── deleteItem ────────────────────────────────────────

  it("deleteItem soft-deletes the item", async () => {
    prisma.evaluationItem.findFirst.mockResolvedValue({ id: "i1" });
    prisma.evaluationItem.update.mockResolvedValue({ id: "i1" });

    await service.remove("i1");
    const call = prisma.evaluationItem.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "i1" });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
  });

  it("deleteItem throws NotFoundException for unknown item", async () => {
    prisma.evaluationItem.findFirst.mockResolvedValue(null);
    await expect(service.remove("nope")).rejects.toThrow(NotFoundException);
  });

  it("handles count larger than available items", async () => {
    const items = [
      { id: "i1", difficulty: 1, bank_id: "b1" },
      { id: "i2", difficulty: 2, bank_id: "b1" },
    ];
    prisma.evaluationItem.findMany.mockResolvedValue(items);

    const drawn = await service.drawStratified({ bank_id: "b1", count: 10 });
    expect(drawn.length).toBe(2);
  });
});
