import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ProgressUpdatedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 R-1.3, §11 US-1.2

export interface SaveProgressDto {
  readonly learner_id: string;
  readonly module_id: string;
  readonly module_version_hash: string;
  readonly progress_percent: number;
}

export interface ProgressRecord {
  readonly id: string;
  readonly learner_id: string;
  readonly module_id: string;
  readonly module_version_hash: string;
  readonly progress_percent: number;
  readonly updated_at: string;
}

@Injectable()
export class ProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  async saveProgress(userId: string, dto: SaveProgressDto): Promise<ProgressRecord> {
    const mod = await this.prisma.module.findFirst({ where: { id: dto.module_id } });
    if (!mod) throw new NotFoundException(`Module ${dto.module_id} not found`);

    const now = new Date().toISOString();
    const record: ProgressRecord = {
      id: randomUUID(),
      learner_id: dto.learner_id,
      module_id: dto.module_id,
      module_version_hash: dto.module_version_hash,
      progress_percent: dto.progress_percent,
      updated_at: now,
    };

    const payload: ProgressUpdatedPayload = {
      learner_id: dto.learner_id,
      module_id: dto.module_id,
      module_version_hash: dto.module_version_hash,
      progress_percent: dto.progress_percent,
    };

    await this.prisma.domainEvent.create({
      data: {
        id: randomUUID(),
        event_name: "ProgressUpdated",
        event_version: "1",
        produced_by: "progression-service",
        payload: payload as object,
      },
    });

    return record;
  }

  async getProgressSummary(learnerId: string): Promise<Record<string, number>> {
    const events = await this.prisma.domainEvent.findMany({
      where: {
        event_name: "ProgressUpdated",
        payload: { path: ["learner_id"], equals: learnerId },
      },
      orderBy: { occurred_at: "desc" },
    });

    const summary: Record<string, number> = {};
    for (const ev of events) {
      const p = ev.payload as { module_id?: string; progress_percent?: number };
      if (p.module_id && !(p.module_id in summary)) {
        summary[p.module_id] = p.progress_percent ?? 0;
      }
    }
    return summary;
  }
}
