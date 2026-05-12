// Refs: SPEC.md §9 US-2b.4 — Défi inter-équipes
// Event TeamChallengeCompleted émis à la clôture
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChallengeService } from "./challenge.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const makePrisma = () =>
  ({
    teamChallenge: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    learner: { findMany: vi.fn() },
    stamp: { findMany: vi.fn() },
    domainEvent: { create: vi.fn() },
  }) as unknown as PrismaService;

const challenge = {
  id: "ch-1", title_fr: "Défi RGPD",
  team_ids: ["team-a", "team-b"], competence_id: "comp-1",
  starts_at: new Date(Date.now() - 86400000 * 7),
  ends_at: new Date(Date.now() - 86400000),
  status: "active",
};

describe("ChallengeService", () => {
  let prisma: PrismaService;
  let service: ChallengeService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ChallengeService(prisma);
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("createChallenge — crée un défi avec les équipes données", async () => {
    (prisma.teamChallenge.create as ReturnType<typeof vi.fn>).mockResolvedValue(challenge);

    const ch = await service.createChallenge({
      title_fr: "Défi RGPD", team_ids: ["team-a", "team-b"],
      competence_id: "comp-1", starts_at: new Date(), ends_at: new Date(Date.now() + 86400000 * 7),
    });

    expect(ch.team_ids).toHaveLength(2);
  });

  it("closeChallenge — calcule le gagnant, émet TeamChallengeCompleted", async () => {
    (prisma.teamChallenge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(challenge);
    (prisma.learner.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "l1", team_id: "team-a" },
      { id: "l2", team_id: "team-a" },
      { id: "l3", team_id: "team-b" },
    ]);
    // Learners de team-a ont de meilleurs scores
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { learner_id: "l1", competence_id: "comp-1", performance_score: 90, state: "green" },
      { learner_id: "l2", competence_id: "comp-1", performance_score: 80, state: "green" },
      { learner_id: "l3", competence_id: "comp-1", performance_score: 50, state: "orange" },
    ]);
    (prisma.teamChallenge.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...challenge, status: "completed" });

    await service.closeChallenge("ch-1");

    expect(prisma.domainEvent.create).toHaveBeenCalledOnce();
    const evt = (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(evt.event_name).toBe("TeamChallengeCompleted");
    expect(evt.payload.winner_team_id).toBe("team-a");
  });

  it("closeChallenge — rejette si défi non trouvé", async () => {
    (prisma.teamChallenge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.closeChallenge("ghost")).rejects.toThrow();
  });

  it("it_does_not_leak_across_tenants — challenge scopé par id", async () => {
    (prisma.teamChallenge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.closeChallenge("ch-99")).rejects.toThrow();

    const call = (prisma.teamChallenge.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.id).toBe("ch-99");
  });
});
