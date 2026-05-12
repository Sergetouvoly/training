import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { AppConfigService } from "./app-config.service.js";

// Refs: SPEC.md §7 — AppConfig R+U (super_admin), R (admin)

const KNOWN_KEYS = [
  "stamp_validity_months",
  "mastery_window",
  "llm_provider",
  "llm_model",
  "llm_api_key_ref",
  "llm_max_tokens_per_call",
  "llm_max_tokens_per_user_day",
];

function makePrismaStub() {
  return {
    appConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  } as any;
}

describe("AppConfigService", () => {
  let service: AppConfigService;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    service = new AppConfigService(prisma);
  });

  it("listAll returns all config entries", async () => {
    prisma.appConfig.findMany.mockResolvedValue([
      { key: "stamp_validity_months", value: 12, updated_at: new Date() },
    ]);
    const result = await service.listAll();
    expect(result).toHaveLength(1);
    expect(prisma.appConfig.findMany).toHaveBeenCalledWith({ orderBy: { key: "asc" } });
  });

  it("getByKey returns config entry", async () => {
    prisma.appConfig.findUnique.mockResolvedValue({ key: "stamp_validity_months", value: 12, updated_at: new Date() });
    const result = await service.getByKey("stamp_validity_months");
    expect(result.key).toBe("stamp_validity_months");
  });

  it("getByKey throws NotFoundException for unknown key", async () => {
    prisma.appConfig.findUnique.mockResolvedValue(null);
    await expect(service.getByKey("unknown_key")).rejects.toThrow(NotFoundException);
  });

  it("set upserts a config entry", async () => {
    prisma.appConfig.upsert.mockResolvedValue({ key: "stamp_validity_months", value: 24, updated_at: new Date() });

    const result = await service.set("stamp_validity_months", 24);
    expect(result.value).toBe(24);
    expect(prisma.appConfig.upsert).toHaveBeenCalledWith({
      where: { key: "stamp_validity_months" },
      create: { key: "stamp_validity_months", value: 24 },
      update: { value: 24 },
    });
  });

  it("listAll returns entries for all known keys when seeded", async () => {
    const entries = KNOWN_KEYS.map((k) => ({ key: k, value: 1, updated_at: new Date() }));
    prisma.appConfig.findMany.mockResolvedValue(entries);
    const result = await service.listAll();
    expect(result).toHaveLength(KNOWN_KEYS.length);
  });
});
