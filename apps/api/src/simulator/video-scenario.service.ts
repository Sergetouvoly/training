import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-2a.2 — Vidéo interactive branchée
// Extension du ScenarioNode: choices JSON enrichi avec video_url + choice_reveal_at_seconds

export interface VideoNodeChoice {
  readonly label_fr: string;
  readonly next_node_id: string | null;
  readonly is_correct: boolean;
}

export interface CreateVideoNodeDto {
  readonly scenario_id: string;
  readonly content_fr: string;
  readonly video_url: string;
  readonly choice_reveal_at_seconds: number;
  readonly choices: VideoNodeChoice[];
  readonly is_terminal?: boolean;
}

@Injectable()
export class VideoScenarioService {
  constructor(private readonly prisma: PrismaService) {}

  async createVideoNode(dto: CreateVideoNodeDto) {
    if (!dto.video_url) throw new BadRequestException("video_url is required for a video node");
    if (dto.choice_reveal_at_seconds <= 0) {
      throw new BadRequestException("choice_reveal_at_seconds must be > 0");
    }

    const scenario = await this.prisma.scenario.findFirst({
      where: { id: dto.scenario_id },
    });
    if (!scenario) throw new NotFoundException(`Scenario ${dto.scenario_id} not found`);

    const choicesWithMeta = dto.choices.map((c) => ({ ...c }));

    return this.prisma.scenarioNode.create({
      data: {
        id: randomUUID(),
        scenario_id: dto.scenario_id,
        content_fr: dto.content_fr,
        is_terminal: dto.is_terminal ?? false,
        choices: {
          video_url: dto.video_url,
          choice_reveal_at_seconds: dto.choice_reveal_at_seconds,
          items: choicesWithMeta,
        } as any,
      },
    });
  }
}
