import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import { ItemService } from "./item.service.js";
import type { CompetenceValidatedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 US-1.3, R-1.3, WORKFLOW.md §6 BLOC 5

export interface SubmitEvaluationDto {
  readonly learner_id: string;
  readonly competence_id: string;
  readonly bank_id: string;
  readonly module_id: string;
  readonly module_version_hash: string;
  readonly answers: readonly { item_id: string; answer: string | string[] }[];
}

export interface EvaluationResult {
  readonly stamp_id: string;
  readonly performance_score: number;
  readonly total_items: number;
  readonly correct_items: number;
  readonly state: "green" | "orange" | "red";
}

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemService: ItemService,
  ) {}

  async submit(dto: SubmitEvaluationDto): Promise<EvaluationResult> {
    if (dto.answers.length === 0) {
      throw new BadRequestException("No answers submitted");
    }

    const competence = await this.prisma.competence.findFirst({
      where: { id: dto.competence_id },
    });
    if (!competence) throw new NotFoundException(`Competence ${dto.competence_id} not found`);

    const mod = await this.prisma.module.findFirst({ where: { id: dto.module_id } });
    if (!mod) throw new NotFoundException(`Module ${dto.module_id} not found`);

    let correct = 0;
    for (const ans of dto.answers) {
      const item = await this.itemService.findById(ans.item_id);
      if (this.isCorrect(item, ans.answer)) {
        correct++;
      }
    }

    const performanceScore = Math.round((correct / dto.answers.length) * 100);

    const config = await this.prisma.appConfig.findUnique({ where: { key: "stamp_validity_months" } });
    const validityMonths = (config?.value as number | null) ?? 12;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + validityMonths);

    const previousStamps = await this.prisma.stamp.count({
      where: { learner_id: dto.learner_id, competence_id: dto.competence_id },
    });

    const stamp = await this.prisma.stamp.create({
      data: {
        learner_id: dto.learner_id,
        competence_id: dto.competence_id,
        state: "green",
        validated_at: now,
        expires_at: expiresAt,
        module_version_hash: dto.module_version_hash,
        performance_score: performanceScore,
        mastery_score: null,
        attempts: previousStamps + 1,
      },
    });

    const payload: CompetenceValidatedPayload = {
      learner_id: dto.learner_id,
      competence_id: dto.competence_id,
      stamp_id: stamp.id,
      performance_score: performanceScore,
      module_version_hash: dto.module_version_hash,
    };

    await this.prisma.domainEvent.create({
      data: {
        id: randomUUID(),
        event_name: "CompetenceValidated",
        event_version: "1",
        produced_by: "evaluation-service",
        payload: payload as object,
      },
    });

    return {
      stamp_id: stamp.id,
      performance_score: performanceScore,
      total_items: dto.answers.length,
      correct_items: correct,
      state: "green",
    };
  }

  private isCorrect(item: any, answer: string | string[]): boolean {
    const content = item.content as any;
    const format = item.format as string;

    if (format === "true_false") {
      return content.correct_answer === answer;
    }

    if (format === "qcm_single") {
      const correctChoice = content.choices?.find((c: any) => c.is_correct);
      return correctChoice?.label === answer;
    }

    if (format === "qcm_multi") {
      const correctLabels = (content.choices ?? [])
        .filter((c: any) => c.is_correct)
        .map((c: any) => c.label)
        .sort();
      const givenLabels = Array.isArray(answer) ? [...answer].sort() : [answer].sort();
      return (
        correctLabels.length === givenLabels.length &&
        correctLabels.every((l: string, i: number) => l === givenLabels[i])
      );
    }

    return false;
  }
}
