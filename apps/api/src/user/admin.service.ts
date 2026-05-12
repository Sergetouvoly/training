import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §7 — CRUD users (super_admin + admin)

export interface CreateUserDto {
  readonly email: string;
  readonly display_name: string;
  readonly platform_role: string;
  readonly password: string;
  readonly job_role?: string;
  readonly team_id?: string;
}

export interface ListUsersQuery {
  readonly q?: string;
  readonly role?: string;
  readonly status?: "active" | "inactive";
}

export interface UpdateUserDto {
  readonly display_name?: string;
  readonly platform_role?: string;
  readonly is_active?: boolean;
  readonly job_role?: string;
  readonly team_id?: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: ListUsersQuery = {}) {
    const where: any = {};

    if (query.role) {
      where.platform_role = query.role;
    }
    if (query.status === "active") {
      where.is_active = true;
    } else if (query.status === "inactive") {
      where.is_active = false;
    }
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: "insensitive" } },
        { display_name: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { created_at: "desc" },
      include: { learner: true },
    });
    return users.map(toUserDto);
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { learner: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return toUserDto(user);
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException(`Email ${dto.email} already in use`);

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          id: randomUUID(),
          email: dto.email,
          display_name: dto.display_name,
          platform_role: dto.platform_role as any,
          password_hash,
        },
        include: { learner: true },
      });

      if (dto.job_role) {
        await tx.learner.create({
          data: {
            id: randomUUID(),
            user_id: created.id,
            job_role: dto.job_role,
            team_id: dto.team_id ?? null,
          },
        });
      }

      return created;
    });

    return toUserDto(user);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const existing = await this.findOrThrow(id);
    if (
      dto.platform_role !== undefined &&
      dto.platform_role !== "super_admin" &&
      existing.platform_role === "super_admin"
    ) {
      const remaining = await this.prisma.user.findMany({ where: { platform_role: "super_admin" } });
      if (remaining.length <= 1) {
        throw new ForbiddenException("Cannot demote the last super_admin");
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.display_name !== undefined && { display_name: dto.display_name }),
        ...(dto.platform_role !== undefined && { platform_role: dto.platform_role as any }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
      include: { learner: true },
    });

    if ((dto.job_role !== undefined || dto.team_id !== undefined) && updated.learner) {
      await this.prisma.learner.update({
        where: { id: updated.learner.id },
        data: {
          ...(dto.job_role !== undefined && { job_role: dto.job_role }),
          ...(dto.team_id !== undefined && { team_id: dto.team_id }),
        },
      });
    }

    return toUserDto(updated);
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOrThrow(id);
    const password_hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { password_hash } });
  }

  async deleteUser(id: string, callerId?: string) {
    const user = await this.findOrThrow(id);
    if (callerId && callerId === id) {
      throw new ForbiddenException("Cannot delete your own account");
    }
    if (user.platform_role === "super_admin") {
      const remaining = await this.prisma.user.findMany({ where: { platform_role: "super_admin" } });
      if (remaining.length <= 1) {
        throw new ForbiddenException("Cannot delete the last super_admin");
      }
    }
    return this.prisma.user.delete({ where: { id } });
  }

  async listLearners() {
    const users = await this.prisma.user.findMany({
      where: { learner: { isNot: null } },
      orderBy: { created_at: "desc" },
      include: { learner: { include: { stamps: true } } },
    });
    return users
      .filter((u: any) => u.learner !== null)
      .map((u: any) => toLearnerSummary(u));
  }

  async getLearnerDetail(learnerId: string) {
    const learner = await this.prisma.learner.findUnique({
      where: { id: learnerId },
      include: {
        user: true,
        stamps: { include: { competence: true } },
      },
    });
    if (!learner) throw new NotFoundException(`Learner ${learnerId} not found`);

    const progressEvents = await this.prisma.domainEvent.findMany({
      where: {
        event_name: "ProgressUpdated",
        payload: { path: ["learner_id"], equals: learnerId },
      },
      orderBy: { occurred_at: "desc" },
    });

    const progressMap = new Map<string, { module_id: string; progress_percent: number; updated_at: Date }>();
    for (const ev of progressEvents) {
      const p = ev.payload as { module_id?: string; progress_percent?: number };
      if (p.module_id && !progressMap.has(p.module_id)) {
        progressMap.set(p.module_id, {
          module_id: p.module_id,
          progress_percent: p.progress_percent ?? 0,
          updated_at: ev.occurred_at,
        });
      }
    }

    return toLearnerDetail(learner, [...progressMap.values()]);
  }

  private async findOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}

function toUserDto(user: any) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    platform_role: user.platform_role,
    is_active: user.is_active,
    mfa_enabled: user.mfa_enabled,
    created_at: user.created_at,
    job_role: user.learner?.job_role ?? null,
    team_id: user.learner?.team_id ?? null,
  };
}

function toLearnerSummary(user: any) {
  const stamps: any[] = user.learner?.stamps ?? [];
  return {
    id: user.learner.id,
    email: user.email,
    display_name: user.display_name,
    primary_role: user.learner.job_role,
    team_id: user.learner.team_id ?? null,
    created_at: user.created_at,
    stamp_count: stamps.length,
    green_count: stamps.filter((s: any) => s.state === "green").length,
    orange_count: stamps.filter((s: any) => s.state === "orange").length,
    red_count: stamps.filter((s: any) => s.state === "red").length,
  };
}

function toLearnerDetail(learner: any, progression: any[] = []) {
  const stamps: any[] = learner.stamps ?? [];
  return {
    id: learner.id,
    email: learner.user.email,
    display_name: learner.user.display_name,
    primary_role: learner.job_role,
    team_id: learner.team_id ?? null,
    created_at: learner.created_at,
    stamp_count: stamps.length,
    green_count: stamps.filter((s: any) => s.state === "green").length,
    orange_count: stamps.filter((s: any) => s.state === "orange").length,
    red_count: stamps.filter((s: any) => s.state === "red").length,
    stamps: stamps.map((s: any) => ({
      id: s.id,
      state: s.state,
      validated_at: s.validated_at,
      expires_at: s.expires_at,
      performance_score: s.performance_score,
      attempts: s.attempts,
      competence_code: s.competence?.code ?? "",
      competence_label_fr: s.competence?.label_fr ?? "",
    })),
    progress: progression.map((p: any) => ({
      module_id: p.module_id,
      progress_percent: p.progress_percent,
      updated_at: p.updated_at,
    })),
  };
}
