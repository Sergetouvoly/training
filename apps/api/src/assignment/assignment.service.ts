import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import type { AssignmentCreatedPayload, AssignmentDeletedPayload } from "@elearning/domain";
import { NotificationService } from "../social/notification.service.js";
import { EmailService } from "../social/email.service.js";
import { emailTemplates } from "../social/email-templates.js";

// Refs: SPEC.md §7 — assignation module/parcours
// Scope rules:
//   admin/super_admin : aucune restriction
//   trainer           : tous les apprenants (assignment.read_cross_team via grant pour restreindre si besoin)
//   manager           : equipe seulement, sauf si assignment.read_cross_team grant

export interface CreateAssignmentDto {
  readonly assignee_id: string;
  readonly resource_type: "module" | "path";
  readonly resource_id: string;
  readonly due_date?: string | null;
}

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  async create(caller: AuthUser, dto: CreateAssignmentDto) {
    await this.assertCanActOnAssignee(caller, dto.assignee_id);

    const existing = await this.prisma.assignment.findFirst({
      where: {
        assignee_id: dto.assignee_id,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        deleted_at: null,
      },
    });
    if (existing) {
      throw new ConflictException("Assignment already exists for this learner and resource");
    }

    const id = randomUUID();
    const payload: AssignmentCreatedPayload = {
      assignment_id: id,
      assignee_id: dto.assignee_id,
      assigner_id: caller.user_id,
      resource_type: dto.resource_type,
      resource_id: dto.resource_id,
      due_date: dto.due_date ?? null,
    };

    const [assignment] = await Promise.all([
      this.prisma.assignment.create({
        data: {
          id,
          assignee_id: dto.assignee_id,
          assigner_id: caller.user_id,
          resource_type: dto.resource_type,
          resource_id: dto.resource_id,
          due_date: dto.due_date ? new Date(dto.due_date) : null,
        },
        include: this.includeAssignerIfAllowed(caller),
      }),
      this.prisma.domainEvent.create({
        data: {
          id: randomUUID(),
          event_name: "AssignmentCreated",
          event_version: "1",
          produced_by: "assignment-service",
          payload: payload as object,
        },
      }),
    ]);

    // Notification in-app + email (fire-and-forget — ne bloque pas la réponse)
    this.notifyAssignment(dto.assignee_id, dto.resource_type, dto.resource_id).catch(() => {/* ignore */});

    return assignment;
  }

  private async notifyAssignment(assigneeId: string, resourceType: string, resourceId: string) {
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
      select: { email: true, display_name: true },
    });
    if (!assignee) return;

    const title = await this.resolveResourceTitle(resourceType, resourceId);
    const platformUrl = await this.emailService.getPlatformUrl();

    await this.notificationService.push({
      learner_id: assigneeId,
      type: "module_assigned",
      payload: { resource_type: resourceType, resource_id: resourceId, title, action_url: "/parcours" },
    });

    const { subject, html } = emailTemplates.moduleAssigned(assignee.display_name, title, platformUrl);
    await this.emailService.send(assignee.email, subject, html);
  }

  private async resolveResourceTitle(resourceType: string, resourceId: string): Promise<string> {
    if (resourceType === "path") {
      const path = await this.prisma.learningPath.findUnique({ where: { id: resourceId }, select: { title_fr: true } });
      return path?.title_fr ?? resourceId;
    }
    const mod = await this.prisma.module.findUnique({ where: { id: resourceId }, select: { title_fr: true } });
    return mod?.title_fr ?? resourceId;
  }

  async list(caller: AuthUser, filters?: { assignee_id?: string; resource_type?: string }) {
    const where = await this.buildScopeWhere(caller, filters);

    return this.prisma.assignment.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: this.includeAssignerIfAllowed(caller),
    });
  }

  async listForAssignee(caller: AuthUser, assigneeId: string) {
    await this.assertCanActOnAssignee(caller, assigneeId);

    return this.prisma.assignment.findMany({
      where: { assignee_id: assigneeId, deleted_at: null },
      orderBy: { created_at: "desc" },
      include: this.includeAssignerIfAllowed(caller),
    });
  }

  async remove(caller: AuthUser, assignmentId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, deleted_at: null },
    });
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);

    await this.assertCanActOnAssignee(caller, assignment.assignee_id);

    const payload: AssignmentDeletedPayload = {
      assignment_id: assignmentId,
      assignee_id: assignment.assignee_id,
      deleted_by: caller.user_id,
      resource_type: assignment.resource_type as "module" | "path",
      resource_id: assignment.resource_id,
    };

    await Promise.all([
      this.prisma.assignment.update({
        where: { id: assignmentId },
        data: { deleted_at: new Date() },
      }),
      this.prisma.domainEvent.create({
        data: {
          id: randomUUID(),
          event_name: "AssignmentDeleted",
          event_version: "1",
          produced_by: "assignment-service",
          payload: payload as object,
        },
      }),
    ]);

    return { deleted: true };
  }

  // ─── Scope helpers ─────────────────────────────────────

  private async assertCanActOnAssignee(caller: AuthUser, assigneeId: string) {
    // admin/super_admin : pas de restriction
    if (caller.app_role === "super_admin" || caller.app_role === "admin") return;

    // cross-team grant : pas de restriction non plus
    if (caller.permissions.includes("assignment.read_cross_team")) return;

    // manager sans cross_team : uniquement son equipe
    if (caller.app_role === "manager") {
      const callerLearner = await this.prisma.learner.findUnique({ where: { user_id: caller.user_id } });
      if (!callerLearner?.team_id) {
        throw new ForbiddenException("Manager has no team assigned");
      }
      const targetLearner = await this.prisma.learner.findUnique({ where: { user_id: assigneeId } });
      if (targetLearner?.team_id !== callerLearner.team_id) {
        throw new ForbiddenException("Manager can only assign within their own team");
      }
      return;
    }

    // trainer sans cross_team : tous les apprenants (scope par defaut)
    // pas de restriction supplémentaire ici — le guard assignment.create suffit
  }

  private async buildScopeWhere(caller: AuthUser, filters?: { assignee_id?: string; resource_type?: string }) {
    const base: Record<string, unknown> = { deleted_at: null };

    if (filters?.assignee_id) base["assignee_id"] = filters.assignee_id;
    if (filters?.resource_type) base["resource_type"] = filters.resource_type;

    // admin/super_admin/trainer avec cross_team : pas de restriction équipe
    if (
      caller.app_role === "super_admin" ||
      caller.app_role === "admin" ||
      caller.permissions.includes("assignment.read_cross_team")
    ) {
      return base;
    }

    // manager sans cross_team : filtre son équipe
    if (caller.app_role === "manager") {
      const callerLearner = await this.prisma.learner.findUnique({ where: { user_id: caller.user_id } });
      if (callerLearner?.team_id) {
        base["assignee"] = { learner: { team_id: callerLearner.team_id } };
      }
    }

    return base;
  }

  // Inclut le display_name de l'assignant uniquement si la permission show_assigner est active
  private includeAssignerIfAllowed(caller: AuthUser) {
    if (!caller.permissions.includes("assignment.show_assigner")) return undefined;
    return {
      assigner: { select: { id: true, display_name: true } },
    };
  }
}
