import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { LearningService } from "./learning.service.js";

// Refs: SPEC.md §3 L1, §11 US-1.2, US-1.5

function makePrismaStub() {
  return {
    learningPath: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    module: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  } as any;
}

describe("LearningService", () => {
  let service: LearningService;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    service = new LearningService(prisma);
  });

  // ─── LearningPath ──────────────────────────────────────

  it("creates a learning path", async () => {
    prisma.learningPath.create.mockResolvedValue({ id: "lp1" });

    await service.createPath({
      title_fr: "Parcours Secu",
      target_role: "all",
      module_sequence: ["m1", "m2"],
    });

    expect(prisma.learningPath.create).toHaveBeenCalledWith({
      data: {
        title_fr: "Parcours Secu",
        target_role: "all",
        module_sequence: ["m1", "m2"],
        is_mandatory: false,
      },
    });
  });

  it("finds a learning path by id", async () => {
    prisma.learningPath.findFirst.mockResolvedValue({ id: "lp1" });
    const result = await service.findPathById("lp1");
    expect(result.id).toBe("lp1");
    expect(prisma.learningPath.findFirst).toHaveBeenCalledWith({ where: { id: "lp1" } });
  });

  it("throws NotFoundException for unknown path", async () => {
    prisma.learningPath.findFirst.mockResolvedValue(null);
    await expect(service.findPathById("unknown")).rejects.toThrow(NotFoundException);
  });

  it("lists all paths ordered by created_at desc", async () => {
    prisma.learningPath.findMany.mockResolvedValue([]);
    await service.listPaths();
    expect(prisma.learningPath.findMany).toHaveBeenCalledWith({ orderBy: { created_at: "desc" } });
  });

  it("deletes a path by id", async () => {
    prisma.learningPath.findFirst.mockResolvedValue({ id: "lp1" });
    prisma.learningPath.delete.mockResolvedValue({ id: "lp1" });
    await service.deletePath("lp1");
    expect(prisma.learningPath.delete).toHaveBeenCalledWith({ where: { id: "lp1" } });
  });

  // ─── Module ────────────────────────────────────────────

  it("creates a module with status draft", async () => {
    prisma.module.create.mockResolvedValue({ id: "m1" });

    await service.createModule({
      version: "1.0",
      version_hash: "abc123",
      title_fr: "Module Intro",
      competence_ids: ["c1"],
    });

    const call = prisma.module.create.mock.calls[0][0];
    expect(call.data.title_fr).toBe("Module Intro");
    expect(call.data.status).toBe("draft");
    expect(call.data.version).toBe("1.0");
    expect(call.data.version_hash).toBe("abc123");
  });

  it("finds a module by id", async () => {
    prisma.module.findFirst.mockResolvedValue({ id: "m1" });
    const result = await service.findModuleById("m1");
    expect(result.id).toBe("m1");
    expect(prisma.module.findFirst).toHaveBeenCalledWith({ where: { id: "m1" } });
  });

  it("throws NotFoundException for unknown module", async () => {
    prisma.module.findFirst.mockResolvedValue(null);
    await expect(service.findModuleById("unknown")).rejects.toThrow(NotFoundException);
  });

  // ─── updatePath ────────────────────────────────────────

  it("updates a learning path", async () => {
    prisma.learningPath.findFirst.mockResolvedValue({ id: "lp1", title_fr: "Old title", module_sequence: ["m1"] });
    prisma.learningPath.update.mockResolvedValue({ id: "lp1", title_fr: "New title", module_sequence: ["m1", "m2"] });

    await service.updatePath("lp1", { title_fr: "New title", module_sequence: ["m1", "m2"] });

    expect(prisma.learningPath.update).toHaveBeenCalledWith({
      where: { id: "lp1" },
      data: { title_fr: "New title", module_sequence: ["m1", "m2"] },
    });
  });

  it("updatePath throws NotFoundException for unknown path", async () => {
    prisma.learningPath.findFirst.mockResolvedValue(null);
    await expect(service.updatePath("nope", { title_fr: "X" })).rejects.toThrow(NotFoundException);
  });

  // ─── Module ────────────────────────────────────────────

  it("updates module content", async () => {
    prisma.module.findFirst.mockResolvedValue({ id: "m1" });
    prisma.module.update.mockResolvedValue({ id: "m1" });

    await service.updateModuleContent("m1", { content_fr: { lessons: [] } });

    expect(prisma.module.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { content_fr: { lessons: [] } },
    });
  });
});
