import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { LITFAnswerSubmittedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 US-2b.1 (extension Chrome), US-2b.2 (Slack/Teams → Passport)

export type LitfSource = "chrome_extension" | "slack" | "teams" | "web";

export interface SubmitAnswerDto {
  readonly learner_id: string;
  readonly item_id: string;
  readonly answer: string;
  readonly source: LitfSource;
}

@Injectable()
export class LitfService {
  constructor(private readonly prisma: PrismaService) {}

  async submitAnswer(dto: SubmitAnswerDto) {
    const item = await this.prisma.evaluationItem.findFirst({
      where: { id: dto.item_id },
    });
    if (!item) throw new NotFoundException(`Item ${dto.item_id} not found`);

    const content = item.content as Record<string, unknown>;
    const isCorrect = evaluateAnswer(content, dto.answer);
    const now = new Date().toISOString();

    const payload: LITFAnswerSubmittedPayload = {
      learner_id: dto.learner_id,
      item_id: dto.item_id,
      source: dto.source,
      is_correct: isCorrect,
      answered_at: now,
    };

    await this.prisma.domainEvent.create({
      data: {
        id: randomUUID(),
        event_name: "LITFAnswerSubmitted",
        event_version: "1",
        produced_by: `litf-service:${dto.source}`,
        payload: payload as any,
      },
    });

    await this.prisma.streak.upsert({
      where: { learner_id: dto.learner_id },
      create: {
        id: randomUUID(),
        learner_id: dto.learner_id,
        current_days: 1,
        longest_days: 1,
        last_activity_date: new Date(),
      },
      update: { last_activity_date: new Date() },
    });

    return { is_correct: isCorrect, answered_at: now };
  }
}

function evaluateAnswer(content: Record<string, unknown>, answer: string): boolean {
  if (content["correct_answer"] !== undefined) {
    return String(content["correct_answer"]).toLowerCase() === answer.toLowerCase();
  }
  if (Array.isArray(content["choices"])) {
    const choices = content["choices"] as { label: string; is_correct: boolean }[];
    const chosen = choices.find((c) => c.label === answer);
    return chosen?.is_correct ?? false;
  }
  return false;
}
