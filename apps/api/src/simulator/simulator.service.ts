import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CrisisScenarioCompletedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 US-2a.1 — Scénario solo arbre de décision

export interface StartSessionDto {
  readonly scenario_id: string;
  readonly learner_id: string;
}

export interface ChoiceDto {
  readonly choice_index: number;
}

interface NodeChoice {
  label_fr: string;
  next_node_id: string | null;
  is_correct: boolean;
}

@Injectable()
export class SimulatorService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(dto: StartSessionDto) {
    const scenario = await this.prisma.scenario.findFirst({
      where: { id: dto.scenario_id },
    });
    if (!scenario) throw new NotFoundException(`Scenario ${dto.scenario_id} not found`);
    if (!scenario.root_node_id) throw new BadRequestException("Scenario has no root node");

    const rootNode = await this.prisma.scenarioNode.findFirst({
      where: { id: scenario.root_node_id },
    });
    if (!rootNode) throw new NotFoundException("Root node not found");

    return this.prisma.scenarioSession.create({
      data: {
        id: randomUUID(),
        scenario_id: dto.scenario_id,
        learner_id: dto.learner_id,
        current_node_id: rootNode.id,
        path_taken: [],
        completed: false,
      },
    });
  }

  async chooseNode(sessionId: string, dto: ChoiceDto) {
    const session = await this.prisma.scenarioSession.findFirst({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completed) throw new BadRequestException("Session already completed");

    const currentNode = await this.prisma.scenarioNode.findFirst({
      where: { id: session.current_node_id! },
    });
    if (!currentNode) throw new NotFoundException("Current node not found");

    const choices = currentNode.choices as unknown as NodeChoice[];
    if (dto.choice_index < 0 || dto.choice_index >= choices.length) {
      throw new BadRequestException(`choice_index ${dto.choice_index} out of range`);
    }

    const chosen = choices[dto.choice_index];
    const pathEntry = {
      node_id: currentNode.id,
      choice_index: dto.choice_index,
      is_correct: chosen.is_correct,
      chosen_at: new Date().toISOString(),
    };
    const newPath = [...(session.path_taken as object[]), pathEntry];

    let nextNode = null;
    if (chosen.next_node_id) {
      nextNode = await this.prisma.scenarioNode.findFirst({
        where: { id: chosen.next_node_id },
      });
    }

    const isTerminal = !nextNode || nextNode.is_terminal;
    const score = isTerminal ? computeScore(newPath as PathEntry[]) : null;

    const updated = await this.prisma.scenarioSession.update({
      where: { id: sessionId },
      data: {
        current_node_id: isTerminal ? null : nextNode!.id,
        path_taken: newPath,
        completed: isTerminal,
        score: score ?? undefined,
        completed_at: isTerminal ? new Date() : undefined,
      },
    });

    if (isTerminal) {
      const payload: CrisisScenarioCompletedPayload = {
        learner_id: session.learner_id,
        scenario_id: session.scenario_id,
        session_id: sessionId,
        score: score ?? 0,
        path_length: newPath.length,
      };
      await this.prisma.domainEvent.create({
        data: {
          id: randomUUID(),
          event_name: "CrisisScenarioCompleted",
          event_version: "1",
          produced_by: "simulator-service",
          payload: payload as any,
        },
      });
    }

    return updated;
  }
}

interface PathEntry {
  is_correct: boolean;
}

function computeScore(path: PathEntry[]): number {
  if (path.length === 0) return 0;
  const correct = path.filter((p) => p.is_correct).length;
  return Math.round((correct / path.length) * 100);
}
