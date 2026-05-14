import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-1.4 — export RGPD JSON toutes données d'un learner

@Injectable()
export class GdprService {
  constructor(private readonly prisma: PrismaService) {}

  async exportLearnerData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { learner: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const learnerId = user.learner?.id;

    const [stamps, events] = await Promise.all([
      learnerId
        ? this.prisma.stamp.findMany({
            where: { learner_id: learnerId },
            orderBy: { validated_at: "desc" },
          })
        : Promise.resolve([]),
      this.prisma.domainEvent.findMany({
        where: { payload: { path: ["learner_id"], equals: learnerId } },
        orderBy: { occurred_at: "asc" },
      }),
    ]);

    return {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        app_role: user.app_role,
        created_at: user.created_at.toISOString(),
      },
      learner: user.learner
        ? { id: user.learner.id, job_role: user.learner.job_role, team_id: user.learner.team_id }
        : null,
      stamps: stamps.map((s) => ({
        id: s.id,
        competence_id: s.competence_id,
        state: s.state,
        validated_at: s.validated_at.toISOString(),
        expires_at: s.expires_at.toISOString(),
        performance_score: s.performance_score,
        attempts: s.attempts,
      })),
      events: events.map((e) => ({
        event_id: e.id,
        event_name: e.event_name,
        occurred_at: e.occurred_at.toISOString(),
        payload: e.payload,
      })),
    };
  }
}
