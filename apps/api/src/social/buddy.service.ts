import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type { BuddyRoleAcceptedPayload } from "@elearning/domain";

// Refs: SPEC.md §9 US-2b.3 — Buddy référent informel

export interface RequestBuddyDto {
  readonly learner_id: string;
  readonly buddy_id: string;
}

@Injectable()
export class BuddyService {
  constructor(private readonly prisma: PrismaService) {}

  async requestBuddy(dto: RequestBuddyDto) {
    return this.prisma.buddyRelation.create({
      data: {
        id: randomUUID(),
        learner_id: dto.learner_id,
        buddy_id: dto.buddy_id,
        accepted: false,
      },
    });
  }

  async acceptBuddy(relationId: string, acceptingUserId: string) {
    const relation = await this.prisma.buddyRelation.findFirst({
      where: { id: relationId },
    });
    if (!relation) throw new NotFoundException(`BuddyRelation ${relationId} not found`);
    if (relation.buddy_id !== acceptingUserId) {
      throw new ForbiddenException("Only the designated buddy can accept this relation");
    }

    const now = new Date();
    const updated = await this.prisma.buddyRelation.update({
      where: { id: relationId },
      data: { accepted: true, accepted_at: now },
    });

    const payload: BuddyRoleAcceptedPayload = {
      learner_id: relation.learner_id,
      buddy_id: relation.buddy_id,
      relation_id: relationId,
    };

    await this.prisma.domainEvent.create({
      data: {
        id: randomUUID(),
        event_name: "BuddyRoleAccepted",
        event_version: "1",
        produced_by: "buddy-service",
        payload: payload as any,
      },
    });

    return updated;
  }

  async getBuddies(learnerId: string) {
    return this.prisma.buddyRelation.findMany({
      where: { learner_id: learnerId, accepted: true },
    });
  }
}
