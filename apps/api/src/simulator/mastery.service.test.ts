// Refs: SPEC.md TBD-2a.1 RESOLVED — mastery = best(perf) over last N attempts
// Refs: SPEC.md R-2a.1 — mastery_score jamais en certificat conformité
// Refs: SPEC.md R-2a.3 — Orange → suggestion, Rouge → CompetenceExpired
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MasteryService } from "./mastery.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const LEARNER_A = "learner-a";
const LEARNER_B = "learner-b";

const makePrisma = () =>
  ({
    appConfig: { findUnique: vi.fn() },
    stamp: { findMany: vi.fn(), update: vi.fn() },
    domainEvent: { create: vi.fn() },
  }) as unknown as PrismaService;

describe("MasteryService", () => {
  let prisma: PrismaService;
  let service: MasteryService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new MasteryService(prisma);
    (prisma.appConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ key: "mastery_window", value: 3 });
  });

  it("computeMastery — retourne le meilleur score sur les N dernières tentatives", async () => {
    // 4 tentatives, window=3 → prend les 3 dernières [70, 85, 60], best = 85
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s1", performance_score: 50, validated_at: new Date("2024-01-01") },
      { id: "s2", performance_score: 70, validated_at: new Date("2024-02-01") },
      { id: "s3", performance_score: 85, validated_at: new Date("2024-03-01") },
      { id: "s4", performance_score: 60, validated_at: new Date("2024-04-01") },
    ]);

    const mastery = await service.computeMastery(LEARNER_A, "comp-1");
    expect(mastery).toBe(85);
  });

  it("computeMastery — une seule tentative → mastery = performance_score", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s1", performance_score: 72, validated_at: new Date() },
    ]);

    const mastery = await service.computeMastery(LEARNER_A, "comp-1");
    expect(mastery).toBe(72);
  });

  it("computeMastery — aucune tentative → retourne null", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const mastery = await service.computeMastery(LEARNER_A, "comp-1");
    expect(mastery).toBeNull();
  });

  it("checkAndExpire — stamp rouge → émet CompetenceExpired et met à jour le stamp", async () => {
    const redStamp = {
      id: "stamp-red",
      learner_id: LEARNER_A,
      competence_id: "comp-1",
      state: "red",
      expires_at: new Date("2023-01-01"), // expiré
    };

    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([redStamp]);
    (prisma.stamp.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...redStamp, state: "expired" });
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await service.checkAndExpire(LEARNER_A, "comp-1");

    expect(prisma.domainEvent.create).toHaveBeenCalledOnce();
    const evt = (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(evt.event_name).toBe("CompetenceExpired");
    expect(evt.payload.stamp_id).toBe("stamp-red");
  });

  it("checkAndExpire — stamp green non expiré → aucun event émis", async () => {
    const greenStamp = {
      id: "stamp-green",
      learner_id: LEARNER_A,
      competence_id: "comp-1",
      state: "green",
      expires_at: new Date(Date.now() + 86400000 * 300), // dans 300 jours
    };

    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([greenStamp]);

    await service.checkAndExpire(LEARNER_A, "comp-1");

    expect(prisma.domainEvent.create).not.toHaveBeenCalled();
  });

  it("it_does_not_leak_across_tenants — computeMastery scope stamps par learner", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.computeMastery(LEARNER_B, "comp-1");

    const call = (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.learner_id).toBe(LEARNER_B);
  });
});
