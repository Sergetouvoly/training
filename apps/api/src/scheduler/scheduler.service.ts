import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationService } from "../social/notification.service.js";
import { EmailService } from "../social/email.service.js";
import { emailTemplates } from "../social/email-templates.js";

// Refs: SPEC.md §9 US-2b.5 — rappels automatiques cron
// Chaque cron est conditionné par un flag app_config (true par défaut si absent)

@Injectable()
export class SchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkStampsExpiring() {
    if (!(await this.isCronEnabled("cron_stamps_expiring_enabled"))) return;

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stamps = await this.prisma.stamp.findMany({
      where: {
        state: { not: "red" },
        expires_at: { gt: now, lte: in30Days },
      },
      include: {
        learner: { include: { user: { select: { email: true, display_name: true } } } },
        competence: { select: { label_fr: true } },
      },
    });

    const platformUrl = await this.emailService.getPlatformUrl();

    for (const stamp of stamps) {
      const user = stamp.learner.user;
      const expiresAt = stamp.expires_at.toLocaleDateString("fr-FR");
      const competenceLabel = stamp.competence.label_fr;

      await this.notificationService.push({
        learner_id: stamp.learner.user_id,
        type: "stamp_expiring",
        payload: { competence: competenceLabel, expires_at: stamp.expires_at.toISOString(), action_url: "/profil" },
      }).catch(() => {});

      const { subject, html } = emailTemplates.stampExpiring(user.display_name, competenceLabel, expiresAt, platformUrl);
      await this.emailService.send(user.email, subject, html).catch(() => {});
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueAssignments() {
    if (!(await this.isCronEnabled("cron_overdue_assignments_enabled"))) return;

    const now = new Date();
    const assignments = await this.prisma.assignment.findMany({
      where: {
        due_date: { lt: now },
        deleted_at: null,
      },
    });

    const platformUrl = await this.emailService.getPlatformUrl();

    for (const assignment of assignments) {
      const progressEvents = await this.prisma.domainEvent.findMany({
        where: { event_name: "ProgressUpdated" },
        orderBy: { occurred_at: "desc" },
        take: 1000,
      });
      const relevantEvent = progressEvents.find((e) => {
        const p = e.payload as { learner_id?: string; module_id?: string; progress_percent?: number };
        return p.learner_id === assignment.assignee_id &&
          (assignment.resource_type === "module" ? p.module_id === assignment.resource_id : true);
      });
      if (relevantEvent) {
        const p = relevantEvent.payload as { progress_percent?: number };
        if ((p.progress_percent ?? 0) >= 100) continue; // déjà terminé
      }

      const assignee = await this.prisma.user.findUnique({
        where: { id: assignment.assignee_id },
        select: { email: true, display_name: true },
      });
      if (!assignee) continue;

      const title = await this.resolveResourceTitle(assignment.resource_type, assignment.resource_id);
      const dueDate = assignment.due_date!.toLocaleDateString("fr-FR");

      await this.notificationService.push({
        learner_id: assignment.assignee_id,
        type: "assignment_due_reminder",
        payload: { title, due_date: assignment.due_date!.toISOString(), action_url: "/parcours" },
      }).catch(() => {});

      const { subject, html } = emailTemplates.assignmentDueReminder(assignee.display_name, title, dueDate, platformUrl);
      await this.emailService.send(assignee.email, subject, html).catch(() => {});
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkStreaksBroken() {
    if (!(await this.isCronEnabled("cron_streak_reminder_enabled"))) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const streaks = await this.prisma.streak.findMany({
      where: {
        current_days: { gt: 0 },
        last_activity_date: { lt: yesterday },
      },
      select: { learner_id: true, current_days: true },
    });

    for (const streak of streaks) {
      const learner = await this.prisma.learner.findUnique({
        where: { id: streak.learner_id },
        select: { user_id: true },
      });
      if (!learner) continue;

      await this.notificationService.push({
        learner_id: learner.user_id,
        type: "streak_reminder",
        payload: { current_days: streak.current_days, action_url: "/dashboard" },
      }).catch(() => {});
    }
  }

  private async isCronEnabled(key: string): Promise<boolean> {
    const cfg = await this.prisma.appConfig.findUnique({ where: { key } });
    if (!cfg) return true; // activé par défaut si absent
    return cfg.value !== false && cfg.value !== "false";
  }

  private async resolveResourceTitle(resourceType: string, resourceId: string): Promise<string> {
    if (resourceType === "path") {
      const path = await this.prisma.learningPath.findUnique({ where: { id: resourceId }, select: { title_fr: true } });
      return path?.title_fr ?? resourceId;
    }
    const mod = await this.prisma.module.findUnique({ where: { id: resourceId }, select: { title_fr: true } });
    return mod?.title_fr ?? resourceId;
  }
}
