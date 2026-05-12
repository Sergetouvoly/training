import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-2b.5 — Notifications contextuelles

export type NotificationType =
  | "streak_reminder"
  | "stamp_expiring"
  | "buddy_request"
  | "challenge_result";

export interface PushNotificationDto {
  readonly learner_id: string;
  readonly type: NotificationType;
  readonly payload: Record<string, unknown>;
}

export interface ListOptions {
  unread_only?: boolean;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async push(dto: PushNotificationDto) {
    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        learner_id: dto.learner_id,
        type: dto.type,
        payload: dto.payload as any,
        read: false,
      },
    });
  }

  async list(learnerId: string, opts: ListOptions) {
    return this.prisma.notification.findMany({
      where: {
        learner_id: learnerId,
        ...(opts.unread_only ? { read: false } : {}),
      },
      orderBy: { created_at: "desc" },
    });
  }

  async markRead(learnerId: string) {
    return this.prisma.notification.updateMany({
      where: { learner_id: learnerId, read: false },
      data: { read: true },
    });
  }
}
