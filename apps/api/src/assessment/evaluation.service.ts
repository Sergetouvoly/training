import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import { ItemService } from "./item.service.js";
import type { CompetenceValidatedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 US-1.3, R-1.3, R-2a.1

export interface SubmitEvaluationDto {
  readonly learner_id: string;
  readonly competence_id?: string;  // optionnel — fallback sur le premier competence_ids du module
  readonly bank_id?: string;        // optionnel — fallback sur module.quiz_bank_id
  readonly module_id: string;
  readonly module_version_hash: string;
  readonly answers: readonly { item_id: string; answer: string | string[] }[];
}

export interface EvaluationResult {
  readonly stamp_id: string;
  readonly performance_score: number;
  readonly total_items: number;
  readonly correct_items: number;
  readonly passed: boolean;
  readonly passing_score: number;
  readonly state: "green" | "orange" | "red";
}

// Refs: SPEC.md R-1.1 — Green <validityMonths, Orange <validityMonths*1.5, Red = expiré
function calcStampState(expiresAt: Date, validityMonths: number): "green" | "orange" | "red" {
  const now = new Date();
  if (expiresAt <= now) return "red";
  const msUntilExpiry = expiresAt.getTime() - now.getTime();
  const orangeThresholdMs = validityMonths * 1.5 * 30 * 24 * 60 * 60 * 1000;
  const greenThresholdMs = validityMonths * 30 * 24 * 60 * 60 * 1000;
  if (msUntilExpiry <= greenThresholdMs * 0.1) return "orange"; // dernier 10% = orange
  // Un stamp créé maintenant avec expires_at = now + validityMonths est green
  // Il passe orange quand il reste moins de validityMonths*0.5 mois
  const halfMs = (validityMonths * 0.5) * 30 * 24 * 60 * 60 * 1000;
  if (msUntilExpiry <= halfMs) return "orange";
  return "green";
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

    const mod = await this.prisma.module.findFirst({ where: { id: dto.module_id } });
    if (!mod) throw new NotFoundException(`Module ${dto.module_id} not found`);

    // Résoudre competence_id — requis pour créer le stamp
    const competenceId = dto.competence_id ?? (mod.competence_ids[0] as string | undefined);
    if (!competenceId) {
      throw new BadRequestException("No competence_id provided and module has no competence_ids");
    }

    const competence = await this.prisma.competence.findFirst({ where: { id: competenceId } });
    if (!competence) throw new NotFoundException(`Competence ${competenceId} not found`);

    // Vérifier que le learner a bien 100% de progression (toutes les leçons lues)
    // La progression est stockée dans domain_events — on prend le dernier event pour ce module.
    const lastProgress = await this.prisma.domainEvent.findFirst({
      where: {
        event_name: "ProgressUpdated",
        payload: { path: ["learner_id"], equals: dto.learner_id },
      },
      orderBy: { occurred_at: "desc" },
    });
    const progressPct = lastProgress
      ? ((lastProgress.payload as { module_id?: string; progress_percent?: number }).progress_percent ?? 0)
      : 0;
    // On filtre sur module_id dans le payload — la query JSON path ci-dessus filtre learner_id,
    // on affine en mémoire pour le module concerné.
    const moduleEvents = await this.prisma.domainEvent.findMany({
      where: {
        event_name: "ProgressUpdated",
        payload: { path: ["learner_id"], equals: dto.learner_id },
      },
      orderBy: { occurred_at: "desc" },
    });
    const moduleProgress = moduleEvents
      .find((e) => (e.payload as { module_id?: string }).module_id === dto.module_id);
    const moduleProgressPct = (moduleProgress?.payload as { progress_percent?: number } | undefined)?.progress_percent ?? 0;
    if (moduleProgressPct < 100) {
      throw new ForbiddenException("All lessons must be read before taking the quiz");
    }

    // Scoring
    let correct = 0;
    for (const ans of dto.answers) {
      const item = await this.itemService.findById(ans.item_id);
      if (this.isCorrect(item, ans.answer)) correct++;
    }
    const performanceScore = Math.round((correct / dto.answers.length) * 100);

    // Config validité stamp
    const config = await this.prisma.appConfig.findUnique({ where: { key: "stamp_validity_months" } });
    const validityMonths = (config?.value as number | null) ?? 12;

    // Config quiz (passing_score)
    const contentFr = mod.content_fr as Record<string, unknown> | null;
    const quizConfig = contentFr?.["quiz_config"] as { passing_score?: number } | undefined;
    const passingScore = quizConfig?.passing_score ?? 70;
    const passed = performanceScore >= passingScore;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + validityMonths);

    const stampState = calcStampState(expiresAt, validityMonths);

    const previousStamps = await this.prisma.stamp.count({
      where: { learner_id: dto.learner_id, competence_id: competenceId },
    });

    const stamp = await this.prisma.stamp.create({
      data: {
        learner_id: dto.learner_id,
        competence_id: competenceId,
        state: stampState,
        validated_at: now,
        expires_at: expiresAt,
        module_version_hash: dto.module_version_hash,
        performance_score: performanceScore,
        mastery_score: null, // R-2a.1 : jamais en certificat conformite, calculé séparément
        attempts: previousStamps + 1,
      },
    });

    const payload: CompetenceValidatedPayload = {
      learner_id: dto.learner_id,
      competence_id: competenceId,
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
      passed,
      passing_score: passingScore,
      state: stampState,
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
        .map((c: any) => c.label as string)
        .sort((a: string, b: string) => a.localeCompare(b));
      const givenLabels = (Array.isArray(answer) ? [...answer] : [answer])
        .sort((a: string, b: string) => a.localeCompare(b));
      return (
        correctLabels.length === givenLabels.length &&
        correctLabels.every((l: string, i: number) => l === givenLabels[i])
      );
    }

    return false;
  }
}
