import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { randomUUID, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ModulePublishedPayload } from "@elearning/domain";

// Refs: SPEC.md §3 L1, §11 US-1.2, US-1.5

export interface CreateLearningPathDto {
  readonly title_fr: string;
  readonly target_role: "hr" | "developer" | "manager" | "finance" | "all";
  readonly module_sequence: string[];
  readonly is_mandatory?: boolean;
}

export interface CreateModuleDto {
  readonly version?: string;
  readonly version_hash?: string;
  readonly title_fr: string;
  readonly competence_ids?: string[];
  readonly estimated_duration_minutes?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UpdateModuleContentDto {
  readonly content_fr: any;
}

export type UpdateLearningPathDto = Partial<{
  title_fr: string;
  target_role: string;
  module_sequence: string[];
  is_mandatory: boolean;
}>;

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── LearningPath ──────────────────────────────────────

  async createPath(dto: CreateLearningPathDto) {
    return this.prisma.learningPath.create({
      data: {
        title_fr: dto.title_fr,
        target_role: dto.target_role,
        module_sequence: dto.module_sequence,
        is_mandatory: dto.is_mandatory ?? false,
      },
    });
  }

  async findPathById(id: string) {
    const path = await this.prisma.learningPath.findFirst({ where: { id } });
    if (!path) throw new NotFoundException(`LearningPath ${id} not found`);
    return path;
  }

  async listPaths() {
    return this.prisma.learningPath.findMany({ orderBy: { created_at: "desc" } });
  }

  async updatePath(id: string, dto: UpdateLearningPathDto) {
    await this.findPathById(id);
    return this.prisma.learningPath.update({
      where: { id },
      data: {
        ...(dto.title_fr !== undefined && { title_fr: dto.title_fr }),
        ...(dto.target_role !== undefined && { target_role: dto.target_role }),
        ...(dto.module_sequence !== undefined && { module_sequence: dto.module_sequence }),
        ...(dto.is_mandatory !== undefined && { is_mandatory: dto.is_mandatory }),
      },
    });
  }

  async deletePath(id: string) {
    await this.findPathById(id);
    return this.prisma.learningPath.delete({ where: { id } });
  }

  // ─── Module ────────────────────────────────────────────

  async createModule(dto: CreateModuleDto) {
    const id = randomUUID();
    const version = dto.version ?? "1.0.0";
    const version_hash = dto.version_hash ?? id.replace(/-/g, "").slice(0, 32);
    return this.prisma.module.create({
      data: {
        version,
        version_hash,
        title_fr: dto.title_fr,
        status: "draft",
        competence_ids: dto.competence_ids ?? [],
        content_fr: {
          lessons: [],
          quiz_unlock_condition: "all_lessons_read",
          estimated_duration_minutes: dto.estimated_duration_minutes ?? 30,
        },
        estimated_duration_minutes: dto.estimated_duration_minutes ?? 30,
      },
    });
  }

  async findModuleById(id: string) {
    const mod = await this.prisma.module.findFirst({ where: { id } });
    if (!mod) throw new NotFoundException(`Module ${id} not found`);
    return mod;
  }

  async listModules() {
    return this.prisma.module.findMany({ orderBy: { created_at: "desc" } });
  }

  async updateModuleContent(id: string, dto: UpdateModuleContentDto) {
    await this.findModuleById(id);
    return this.prisma.module.update({
      where: { id },
      data: { content_fr: dto.content_fr },
    });
  }

  async deleteModule(id: string) {
    await this.findModuleById(id);
    return this.prisma.module.delete({ where: { id } });
  }

  // Refs: SPEC-CONTENT.md §7.5, SPEC §8 — draft → published
  async publishModule(id: string, publishedBy: string) {
    const mod = await this.findModuleById(id);

    if (mod.status === "published") {
      throw new ForbiddenException(`Module ${id} is already published`);
    }

    const version_hash = createHash("sha256")
      .update(JSON.stringify(mod.content_fr))
      .digest("hex");

    const payload: ModulePublishedPayload = {
      module_id: id,
      version: mod.version as string,
      version_hash,
      published_by: publishedBy,
    };

    const [updated] = await Promise.all([
      this.prisma.module.update({
        where: { id },
        data: { status: "published", version_hash },
      }),
      this.prisma.domainEvent.create({
        data: {
          id: randomUUID(),
          event_name: "ModulePublished",
          event_version: "1",
          produced_by: "learning-service",
          payload: payload as object,
        },
      }),
    ]);

    return updated;
  }
}
