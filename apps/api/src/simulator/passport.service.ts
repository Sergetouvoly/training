import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { StreakReachedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 US-2a.3 — Passport avec Streak
// Refs: SPEC.md R-2a.1 — mastery_score jamais visible dans le Passport partageable

// Paliers de Streak qui déclenchent un event StreakReached
const STREAK_MILESTONES = new Set([3, 7, 14, 30, 60, 100]);

@Injectable()
export class PassportService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveLearnerId(userId: string): Promise<string | null> {
    const learner = await this.prisma.learner.findUnique({ where: { user_id: userId }, select: { id: true } });
    return learner?.id ?? null;
  }

  async getPassport(learnerId: string) {
    const [stamps, streak] = await Promise.all([
      this.prisma.stamp.findMany({
        where: { learner_id: learnerId },
        orderBy: { validated_at: "desc" },
        include: { competence: { select: { id: true, code: true, label_fr: true, label_en: true } } },
      }),
      this.prisma.streak.findUnique({ where: { learner_id: learnerId } }),
    ]);

    return {
      learner_id: learnerId,
      stamps: stamps.map((s) => ({
        id: s.id,
        competence: s.competence,
        state: s.state,
        validated_at: s.validated_at.toISOString(),
        expires_at: s.expires_at.toISOString(),
        performance_score: s.performance_score,
        // R-2a.1 : mastery_score délibérément absent du Passport partageable
        attempts: s.attempts,
      })),
      streak: {
        current_days: streak?.current_days ?? 0,
        longest_days: streak?.longest_days ?? 0,
        last_activity_date: streak?.last_activity_date?.toISOString() ?? null,
      },
    };
  }

  async recordActivity(learnerId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await this.prisma.streak
      .findUnique({ where: { learner_id: learnerId } })
      .catch(() => null);

    let newCurrentDays = 1;
    if (existing?.last_activity_date) {
      const lastDate = new Date(existing.last_activity_date);
      const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const diffDays = Math.round((today.getTime() - lastDay.getTime()) / 86400000);

      if (diffDays === 0) {
        return existing;
      } else if (diffDays === 1) {
        newCurrentDays = (existing.current_days ?? 0) + 1;
      }
    }

    const newLongest = Math.max(existing?.longest_days ?? 0, newCurrentDays);

    const updated = await this.prisma.streak.upsert({
      where: { learner_id: learnerId },
      create: {
        id: randomUUID(),
        learner_id: learnerId,
        current_days: newCurrentDays,
        longest_days: newLongest,
        last_activity_date: now,
      },
      update: {
        current_days: newCurrentDays,
        longest_days: newLongest,
        last_activity_date: now,
      },
    });

    if (STREAK_MILESTONES.has(newCurrentDays)) {
      const payload: StreakReachedPayload = { learner_id: learnerId, days: newCurrentDays };
      await this.prisma.domainEvent.create({
        data: {
          id: randomUUID(),
          event_name: "StreakReached",
          event_version: "1",
          produced_by: "passport-service",
          payload: payload as any,
        },
      });
    }

    return updated;
  }
}
