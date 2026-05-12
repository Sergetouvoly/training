import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CompetenceExpiredPayload } from "@elearning/domain";

// Refs: SPEC.md TBD-2a.1 RESOLVED — mastery = best(perf) over last N attempts (N = app_config.mastery_window)
// Refs: SPEC.md R-2a.1 — mastery_score jamais en certificat conformité
// Refs: SPEC.md R-2a.3 — Rouge + expiré → CompetenceExpired

const DEFAULT_MASTERY_WINDOW = 3;

@Injectable()
export class MasteryService {
  constructor(private readonly prisma: PrismaService) {}

  async computeMastery(learnerId: string, competenceId: string): Promise<number | null> {
    const windowConfig = await this.prisma.appConfig.findUnique({ where: { key: "mastery_window" } });
    const window = (windowConfig?.value as number | null) ?? DEFAULT_MASTERY_WINDOW;

    const stamps = await this.prisma.stamp.findMany({
      where: { learner_id: learnerId, competence_id: competenceId },
      orderBy: { validated_at: "desc" },
      take: window,
    });

    if (stamps.length === 0) return null;

    return Math.max(...stamps.map((s) => s.performance_score));
  }

  // R-2a.3 : stamps rouges expirés → CompetenceExpired
  async checkAndExpire(learnerId: string, competenceId: string): Promise<void> {
    const stamps = await this.prisma.stamp.findMany({
      where: { learner_id: learnerId, competence_id: competenceId },
      orderBy: { validated_at: "desc" },
    });

    const now = new Date();
    for (const stamp of stamps) {
      const isExpired = stamp.expires_at < now;
      const isRed = stamp.state === "red";

      if (isRed && isExpired) {
        await this.prisma.stamp.update({
          where: { id: stamp.id },
          data: { state: "expired" },
        });

        const payload: CompetenceExpiredPayload = {
          learner_id: learnerId,
          competence_id: competenceId,
          stamp_id: stamp.id,
          expired_at: now.toISOString(),
        };

        await this.prisma.domainEvent.create({
          data: {
            id: randomUUID(),
            event_name: "CompetenceExpired",
            event_version: "1",
            produced_by: "mastery-service",
            payload: payload as any,
          },
        });
      }
    }
  }
}
