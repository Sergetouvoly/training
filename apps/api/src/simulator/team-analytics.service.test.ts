// Refs: SPEC.md §9 US-2a.5 — Résultats agrégés anonymisés Manager
// R-4.5 : mode cognitif adapté invisible Manager/RH (pas de données individuelles identifiables)
// ComplianceTwin type: SPEC.md §5
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TeamAnalyticsService } from "./team-analytics.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const TEAM_ID = "team-dev";
const TEAM_B = "team-ops";

const stamps = [
  // Learner 1 — 2 compétences green
  { learner_id: "l1", competence_id: "c1", state: "green", expires_at: new Date(Date.now() + 86400000 * 300), performance_score: 90 },
  { learner_id: "l1", competence_id: "c2", state: "green", expires_at: new Date(Date.now() + 86400000 * 200), performance_score: 80 },
  // Learner 2 — 1 green, 1 orange
  { learner_id: "l2", competence_id: "c1", state: "green", expires_at: new Date(Date.now() + 86400000 * 100), performance_score: 75 },
  { learner_id: "l2", competence_id: "c2", state: "orange", expires_at: new Date(Date.now() + 86400000 * 30), performance_score: 60 },
  // Learner 3 — 1 red
  { learner_id: "l3", competence_id: "c1", state: "red", expires_at: new Date(Date.now() - 86400000), performance_score: 45 },
];

const learners = [
  { id: "l1", team_id: TEAM_ID },
  { id: "l2", team_id: TEAM_ID },
  { id: "l3", team_id: TEAM_ID },
];

const makePrisma = () =>
  ({
    learner: { findMany: vi.fn() },
    stamp: { findMany: vi.fn() },
  }) as unknown as PrismaService;

describe("TeamAnalyticsService", () => {
  let prisma: PrismaService;
  let service: TeamAnalyticsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new TeamAnalyticsService(prisma);
    (prisma.learner.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(learners);
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(stamps);
  });

  it("retourne un agrégat anonymisé sans données individuelles identifiables", async () => {
    const result = await service.getTeamAggregates(TEAM_ID);

    // Agrégat présent
    expect(result.team_id).toBe(TEAM_ID);
    expect(result.member_count).toBe(3);
    expect(result.coverage_ratio).toBeGreaterThan(0);
    expect(result.alert_zone).toMatch(/^(green|amber|red)$/);

    // R-4.5 : aucune donnée individuelle (pas de learner_id, email, display_name)
    expect(result).not.toHaveProperty("learners");
    expect(result).not.toHaveProperty("individual_scores");
  });

  it("coverage_ratio = fraction de learners avec au moins un stamp green", async () => {
    const result = await service.getTeamAggregates(TEAM_ID);
    // l1 et l2 ont au moins un green → 2/3
    expect(result.coverage_ratio).toBeCloseTo(2 / 3, 2);
  });

  it("alert_zone = red quand trop de stamps red/expirés", async () => {
    // Tous rouges
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      learners.map((l) => ({ learner_id: l.id, competence_id: "c1", state: "red", expires_at: new Date(Date.now() - 1), performance_score: 30 }))
    );
    const result = await service.getTeamAggregates(TEAM_ID);
    expect(result.alert_zone).toBe("red");
  });

  it("alert_zone = green quand majorité de stamps green valides", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      learners.flatMap((l) => [
        { learner_id: l.id, competence_id: "c1", state: "green", expires_at: new Date(Date.now() + 86400000 * 200), performance_score: 85 },
        { learner_id: l.id, competence_id: "c2", state: "green", expires_at: new Date(Date.now() + 86400000 * 180), performance_score: 88 },
      ])
    );
    const result = await service.getTeamAggregates(TEAM_ID);
    expect(result.alert_zone).toBe("green");
  });

  it("it_does_not_leak_across_tenants — learners scopés par team", async () => {
    (prisma.learner.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.getTeamAggregates(TEAM_B);

    const call = (prisma.learner.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.team_id).toBe(TEAM_B);
  });

  it("équipe vide → coverage_ratio = 0, alert_zone = green", async () => {
    (prisma.learner.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await service.getTeamAggregates(TEAM_ID);
    expect(result.coverage_ratio).toBe(0);
    expect(result.member_count).toBe(0);
    expect(result.alert_zone).toBe("green");
  });
});
