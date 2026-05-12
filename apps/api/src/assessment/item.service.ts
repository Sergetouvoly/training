import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §3 L2, R-1.2

export interface UpdateItemDto {
  readonly difficulty?: 1 | 2 | 3 | 4 | 5;
  readonly bloom_level?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly concept_tags?: string[];
  readonly content?: {
    readonly question_fr: string;
    readonly question_en?: string;
    readonly choices?: { label: string; is_correct: boolean }[];
    readonly correct_answer?: string;
  };
}

export interface CreateItemDto {
  readonly bank_id: string;
  readonly format: "qcm_single" | "qcm_multi" | "true_false";
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly bloom_level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly concept_tags: string[];
  readonly content: {
    readonly question_fr: string;
    readonly question_en?: string;
    readonly choices?: { label: string; is_correct: boolean }[];
    readonly correct_answer?: string;
  };
}

export interface DrawConfig {
  readonly bank_id: string;
  readonly count: number;
}

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItemDto) {
    return this.prisma.evaluationItem.create({
      data: {
        bank_id: dto.bank_id,
        format: dto.format,
        difficulty: dto.difficulty,
        bloom_level: dto.bloom_level,
        concept_tags: dto.concept_tags,
        content: dto.content as object,
      },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.evaluationItem.findFirst({ where: { id } });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  async listAll() {
    return this.prisma.evaluationItem.findMany({ orderBy: { created_at: "desc" } });
  }

  async listByBank(bankId: string) {
    return this.prisma.evaluationItem.findMany({ where: { bank_id: bankId } });
  }

  async update(id: string, dto: UpdateItemDto) {
    await this.findById(id);
    return this.prisma.evaluationItem.update({
      where: { id },
      data: {
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.bloom_level !== undefined && { bloom_level: dto.bloom_level }),
        ...(dto.concept_tags !== undefined && { concept_tags: dto.concept_tags }),
        ...(dto.content !== undefined && { content: dto.content as object }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.evaluationItem.delete({ where: { id } });
  }

  async drawStratified(config: DrawConfig) {
    const allItems = await this.prisma.evaluationItem.findMany({
      where: { bank_id: config.bank_id },
    });

    if (allItems.length === 0) return [];

    const byDifficulty = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const group = byDifficulty.get(item.difficulty) ?? [];
      group.push(item);
      byDifficulty.set(item.difficulty, group);
    }

    const difficulties = [...byDifficulty.keys()].sort();
    const perLevel = Math.max(1, Math.floor(config.count / difficulties.length));
    const drawn: typeof allItems = [];

    for (const diff of difficulties) {
      const pool = byDifficulty.get(diff)!;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      drawn.push(...shuffled.slice(0, perLevel));
      if (drawn.length >= config.count) break;
    }

    if (drawn.length < config.count) {
      const drawnIds = new Set(drawn.map((d) => d.id));
      const remaining = allItems
        .filter((i) => !drawnIds.has(i.id))
        .sort(() => Math.random() - 0.5);
      drawn.push(...remaining.slice(0, config.count - drawn.length));
    }

    return drawn.slice(0, config.count);
  }
}
