// Refs: SPEC.md §9 US-2b.1 — Question 30s/jour LITF (extension Chrome, Slack, Teams)
// US-2b.2 — Réponse Slack/Teams → Passport (même endpoint, source différente)
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LitfService } from "./litf.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const LEARNER = "learner-1";

const makePrisma = () =>
  ({
    evaluationItem: { findFirst: vi.fn() },
    domainEvent: { create: vi.fn() },
    streak: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ current_days: 1, longest_days: 1 }),
    },
  }) as unknown as PrismaService;

const item = {
  id: "item-1", bank_id: "bank-1",
  format: "true_false", difficulty: 2, bloom_level: 1,
  concept_tags: ["rgpd"], content: { question_fr: "Q?", correct_answer: "true" },
};

describe("LitfService", () => {
  let prisma: PrismaService;
  let service: LitfService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new LitfService(prisma);
    (prisma.evaluationItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(item);
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("enregistre une réponse correcte et émet LITFAnswerSubmitted", async () => {
    const result = await service.submitAnswer({
      learner_id: LEARNER, item_id: "item-1",
      answer: "true", source: "chrome_extension",
    });

    expect(result.is_correct).toBe(true);
    expect(prisma.domainEvent.create).toHaveBeenCalledOnce();
    const evt = (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(evt.event_name).toBe("LITFAnswerSubmitted");
    expect(evt.payload.source).toBe("chrome_extension");
    expect(evt.payload.is_correct).toBe(true);
  });

  it("enregistre une réponse incorrecte", async () => {
    const result = await service.submitAnswer({
      learner_id: LEARNER, item_id: "item-1",
      answer: "false", source: "slack",
    });

    expect(result.is_correct).toBe(false);
    const evt = (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(evt.payload.source).toBe("slack");
  });

  it("accepte les sources chrome_extension, slack, teams, web", async () => {
    for (const source of ["chrome_extension", "slack", "teams", "web"] as const) {
      vi.clearAllMocks();
      (prisma.evaluationItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(item);
      (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.streak.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.streak.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ current_days: 1, longest_days: 1 });

      await expect(
        service.submitAnswer({ learner_id: LEARNER, item_id: "item-1", answer: "true", source })
      ).resolves.toBeDefined();
    }
  });

  it("lève NotFoundException si item introuvable", async () => {
    (prisma.evaluationItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      service.submitAnswer({ learner_id: LEARNER, item_id: "ghost", answer: "true", source: "web" })
    ).rejects.toThrow();
  });

  it("it_does_not_leak_across_tenants — item scopé par learner", async () => {
    (prisma.evaluationItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      service.submitAnswer({ learner_id: "learner-2", item_id: "item-1", answer: "true", source: "web" })
    ).rejects.toThrow();

    const call = (prisma.evaluationItem.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.id).toBe("item-1");
  });
});
