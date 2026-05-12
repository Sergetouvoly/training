import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { TeamChallengeCompletedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 US-2b.4 — Défi inter-équipes

export interface CreateChallengeDto {
  readonly title_fr: string;
  readonly team_ids: string[];
  readonly competence_id: string;
  readonly starts_at: Date;
  readonly ends_at: Date;
}

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async createChallenge(dto: CreateChallengeDto) {
    return this.prisma.teamChallenge.create({
      data: {
        id: randomUUID(),
        title_fr: dto.title_fr,
        team_ids: dto.team_ids,
        competence_id: dto.competence_id,
        starts_at: dto.starts_at,
        ends_at: dto.ends_at,
        status: "active",
      },
    });
  }

  async closeChallenge(challengeId: string) {
    const challenge = await this.prisma.teamChallenge.findFirst({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException(`Challenge ${challengeId} not found`);

    const learners = await this.prisma.learner.findMany({
      where: { team_id: { in: challenge.team_ids } },
      select: { id: true, team_id: true },
    });

    const learnerIds = learners.map((l) => l.id);
    const stamps = await this.prisma.stamp.findMany({
      where: {
        learner_id: { in: learnerIds },
        competence_id: challenge.competence_id,
      },
      select: { learner_id: true, performance_score: true },
    });

    const teamScores: Record<string, number[]> = {};
    for (const teamId of challenge.team_ids) teamScores[teamId] = [];

    for (const stamp of stamps) {
      const learner = learners.find((l) => l.id === stamp.learner_id);
      if (learner?.team_id) teamScores[learner.team_id]?.push(stamp.performance_score);
    }

    const finalScores: Record<string, number> = {};
    for (const [teamId, scores] of Object.entries(teamScores)) {
      finalScores[teamId] = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    }

    const winnerTeamId = Object.entries(finalScores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? challenge.team_ids[0];

    await this.prisma.teamChallenge.update({
      where: { id: challengeId },
      data: { status: "completed" },
    });

    const payload: TeamChallengeCompletedPayload = {
      challenge_id: challengeId,
      winner_team_id: winnerTeamId,
      participating_team_ids: challenge.team_ids,
      final_scores: finalScores,
    };

    await this.prisma.domainEvent.create({
      data: {
        id: randomUUID(),
        event_name: "TeamChallengeCompleted",
        event_version: "1",
        produced_by: "challenge-service",
        payload: payload as any,
      },
    });

    return { winner_team_id: winnerTeamId, final_scores: finalScores };
  }
}
