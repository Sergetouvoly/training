import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export type TrashType = "module" | "learning_path" | "evaluation_item" | "competence";

const TRASH_TABLES = {
  module: "modules",
  learning_path: "learning_paths",
  evaluation_item: "evaluation_items",
  competence: "competences",
} as const;

@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  async listTrashed(type?: TrashType) {
    const filter = { where: { deleted_at: { not: null } } };

    if (!type) {
      const [modules, paths, items, competences] = await Promise.all([
        this.prisma.module.findMany({ ...filter, orderBy: { deleted_at: "desc" } }),
        this.prisma.learningPath.findMany({ ...filter, orderBy: { deleted_at: "desc" } }),
        this.prisma.evaluationItem.findMany({ ...filter, orderBy: { deleted_at: "desc" } }),
        this.prisma.competence.findMany({ ...filter, orderBy: { deleted_at: "desc" } }),
      ]);
      return {
        modules: modules.map((m) => ({ ...m, _type: "module" as const })),
        learning_paths: paths.map((p) => ({ ...p, _type: "learning_path" as const })),
        evaluation_items: items.map((i) => ({ ...i, _type: "evaluation_item" as const })),
        competences: competences.map((c) => ({ ...c, _type: "competence" as const })),
      };
    }

    switch (type) {
      case "module":
        return this.prisma.module.findMany({ ...filter, orderBy: { deleted_at: "desc" } });
      case "learning_path":
        return this.prisma.learningPath.findMany({ ...filter, orderBy: { deleted_at: "desc" } });
      case "evaluation_item":
        return this.prisma.evaluationItem.findMany({ ...filter, orderBy: { deleted_at: "desc" } });
      case "competence":
        return this.prisma.competence.findMany({ ...filter, orderBy: { deleted_at: "desc" } });
    }
  }

  async restore(type: TrashType, id: string) {
    const existing = await this.findTrashedById(type, id);
    if (!existing) throw new NotFoundException(`${type} ${id} not found in trash`);

    switch (type) {
      case "module":
        return this.prisma.module.update({ where: { id }, data: { deleted_at: null } });
      case "learning_path":
        return this.prisma.learningPath.update({ where: { id }, data: { deleted_at: null } });
      case "evaluation_item":
        return this.prisma.evaluationItem.update({ where: { id }, data: { deleted_at: null } });
      case "competence":
        return this.prisma.competence.update({ where: { id }, data: { deleted_at: null } });
    }
  }

  async purge(type: TrashType, id: string) {
    const existing = await this.findTrashedById(type, id);
    if (!existing) throw new NotFoundException(`${type} ${id} not found in trash`);

    switch (type) {
      case "module":
        return this.prisma.module.delete({ where: { id } });
      case "learning_path":
        return this.prisma.learningPath.delete({ where: { id } });
      case "evaluation_item":
        return this.prisma.evaluationItem.delete({ where: { id } });
      case "competence":
        return this.prisma.competence.delete({ where: { id } });
    }
  }

  async purgeExpired() {
    const config = await this.prisma.appConfig.findUnique({ where: { key: "trash_retention_days" } });
    const retentionDays = typeof config?.value === "number" ? config.value : 30;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const filter = { where: { deleted_at: { not: null, lt: cutoff } } };
    const [modules, paths, items, competences] = await Promise.all([
      this.prisma.module.deleteMany(filter),
      this.prisma.learningPath.deleteMany(filter),
      this.prisma.evaluationItem.deleteMany(filter),
      this.prisma.competence.deleteMany(filter),
    ]);

    return {
      purged: modules.count + paths.count + items.count + competences.count,
      retention_days: retentionDays,
      cutoff,
    };
  }

  private async findTrashedById(type: TrashType, id: string) {
    const filter = { where: { id, deleted_at: { not: null } } };
    switch (type) {
      case "module":
        return this.prisma.module.findFirst(filter);
      case "learning_path":
        return this.prisma.learningPath.findFirst(filter);
      case "evaluation_item":
        return this.prisma.evaluationItem.findFirst(filter);
      case "competence":
        return this.prisma.competence.findFirst(filter);
    }
  }

  isValidType(value: string): value is TrashType {
    return Object.keys(TRASH_TABLES).includes(value);
  }
}
