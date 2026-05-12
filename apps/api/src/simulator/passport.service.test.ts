// Refs: SPEC.md §9 US-2a.3 — Passport avec Streak
// Refs: SPEC.md R-1.1 (états Stamp), R-2a.1 (mastery_score jamais visible conformité)
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PassportService } from "./passport.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const LEARNER = "learner-1";
const LEARNER_B = "learner-2";

const stamps = [
  {
    id: "s1", learner_id: LEARNER, competence_id: "comp-1",
    state: "green", validated_at: new Date("2024-06-01"), expires_at: new Date("2025-06-01"),
    performance_score: 85, mastery_score: 90, attempts: 2,
    competence: { id: "comp-1", code: "RGPD-001", label_fr: "Gestion des données", label_en: "Data management" },
  },
  {
    id: "s2", learner_id: LEARNER, competence_id: "comp-2",
    state: "orange", validated_at: new Date("2024-01-01"), expires_at: new Date("2024-07-01"),
    performance_score: 62, mastery_score: 68, attempts: 3,
    competence: { id: "comp-2", code: "RGPD-002", label_fr: "Droits des personnes", label_en: "Data subject rights" },
  },
];

const streak = {
  id: "streak-1", learner_id: LEARNER,
  current_days: 7, longest_days: 14, last_activity_date: new Date(),
};

const makePrisma = () =>
  ({
    stamp: { findMany: vi.fn() },
    streak: { findUnique: vi.fn(), upsert: vi.fn() },
    domainEvent: { create: vi.fn() },
  }) as unknown as PrismaService;

describe("PassportService", () => {
  let prisma: PrismaService;
  let service: PassportService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PassportService(prisma);
  });

  it("getPassport — retourne stamps + streak du learner", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(stamps);
    (prisma.streak.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(streak);

    const passport = await service.getPassport(LEARNER);

    expect(passport.stamps).toHaveLength(2);
    expect(passport.streak.current_days).toBe(7);
    expect(passport.learner_id).toBe(LEARNER);
  });

  it("getPassport — mastery_score absent du Passport (R-2a.1)", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(stamps);
    (prisma.streak.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(streak);

    const passport = await service.getPassport(LEARNER);

    // R-2a.1 : mastery_score ne doit PAS apparaître dans le Passport partageable
    for (const s of passport.stamps) {
      expect(s).not.toHaveProperty("mastery_score");
    }
  });

  it("recordActivity — crée un streak si inexistant, current_days = 1", async () => {
    (prisma.streak.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.streak.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...streak, current_days: 1, longest_days: 1,
    });
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await service.recordActivity(LEARNER);
    expect(result.current_days).toBeGreaterThanOrEqual(1);
  });

  it("recordActivity — atteinte d'un palier (7 jours) → émet StreakReached", async () => {
    // Simule un streak existant à 6 jours, activité hier → passe à 7
    (prisma.streak.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...streak, current_days: 6, last_activity_date: new Date(Date.now() - 86400000),
    });
    (prisma.streak.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...streak, current_days: 7,
    });
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await service.recordActivity(LEARNER);

    expect(prisma.domainEvent.create).toHaveBeenCalledOnce();
    const evt = (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(evt.event_name).toBe("StreakReached");
    expect(evt.payload.days).toBe(7);
  });

  it("recordActivity — pas de palier (5 jours) → aucun event StreakReached", async () => {
    (prisma.streak.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...streak, current_days: 4, last_activity_date: new Date(Date.now() - 86400000),
    });
    (prisma.streak.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...streak, current_days: 5,
    });
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await service.recordActivity(LEARNER);

    expect(prisma.domainEvent.create).not.toHaveBeenCalled();
  });

  it("it_does_not_leak_across_tenants — stamps scoped par learner", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.streak.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await service.getPassport(LEARNER_B);

    const call = (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.learner_id).toBe(LEARNER_B);
  });
});
