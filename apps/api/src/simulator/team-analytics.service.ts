import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-2a.5 — Résultats agrégés anonymisés Manager
// Refs: SPEC.md §5 ComplianceTwin (coverage_ratio, freshness_ratio, alert_zone)
// R-4.5 : aucune donnée individuelle identifiable dans la réponse

export interface TeamAggregate {
  team_id: string;
  member_count: number;
  coverage_ratio: number;
  freshness_ratio: number;
  green_ratio: number;
  orange_ratio: number;
  red_ratio: number;
  alert_zone: "green" | "amber" | "red";
  computed_at: string;
}

@Injectable()
export class TeamAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamAggregates(teamId: string): Promise<TeamAggregate> {
    const learners = await this.prisma.learner.findMany({
      where: { team_id: teamId },
      select: { id: true },
    });

    if (learners.length === 0) {
      return emptyAggregate(teamId);
    }

    const learnerIds = learners.map((l) => l.id);

    const stamps = await this.prisma.stamp.findMany({
      where: { learner_id: { in: learnerIds } },
      select: { learner_id: true, state: true, expires_at: true },
    });

    const now = new Date();
    const total = stamps.length;

    if (total === 0) {
      return { ...emptyAggregate(teamId), member_count: learners.length };
    }

    const fresh = stamps.filter((s) => s.expires_at > now).length;
    const green = stamps.filter((s) => s.state === "green").length;
    const orange = stamps.filter((s) => s.state === "orange").length;
    const red = stamps.filter((s) => s.state === "red" || s.state === "expired").length;

    const learnersWithGreen = new Set(
      stamps.filter((s) => s.state === "green" && s.expires_at > now).map((s) => s.learner_id)
    );
    const coverageRatio = learnersWithGreen.size / learners.length;

    const greenRatio = green / total;
    const alertZone = computeAlertZone(coverageRatio, red / total);

    return {
      team_id: teamId,
      member_count: learners.length,
      coverage_ratio: coverageRatio,
      freshness_ratio: fresh / total,
      green_ratio: greenRatio,
      orange_ratio: orange / total,
      red_ratio: red / total,
      alert_zone: alertZone,
      computed_at: now.toISOString(),
    };
  }
}

function emptyAggregate(teamId: string): TeamAggregate {
  return {
    team_id: teamId, member_count: 0,
    coverage_ratio: 0, freshness_ratio: 0,
    green_ratio: 0, orange_ratio: 0, red_ratio: 0,
    alert_zone: "green", computed_at: new Date().toISOString(),
  };
}

function computeAlertZone(coverageRatio: number, redRatio: number): "green" | "amber" | "red" {
  if (redRatio > 0.3 || coverageRatio < 0.5) return "red";
  if (redRatio > 0.1 || coverageRatio < 0.8) return "amber";
  return "green";
}
