import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §8 US-1.1 — wizard onboarding première connexion learner
// Affichage conditionné : platformRole === "learner" && onboarding_completed_at === null

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async checkOnboarding(userId: string): Promise<{ completed: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { onboarding_completed_at: true },
    });
    return { completed: user?.onboarding_completed_at !== null && user?.onboarding_completed_at !== undefined };
  }

  async completeOnboarding(userId: string, jobRole: string): Promise<void> {
    const now = new Date();
    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: { onboarding_completed_at: now },
      }),
      this.prisma.learner.upsert({
        where: { user_id: userId },
        update: { job_role: jobRole },
        create: { id: randomUUID(), user_id: userId, job_role: jobRole },
      }),
      this.prisma.domainEvent.create({
        data: {
          id: randomUUID(),
          event_name: "OnboardingCompleted",
          event_version: "1",
          produced_by: "onboarding-service",
          payload: { user_id: userId, completed_at: now.toISOString(), job_role: jobRole } as object,
        },
      }),
    ]);
  }
}
