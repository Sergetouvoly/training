// Refs: SPEC.md §9 US-2b.5 — Notifications contextuelles
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotificationService } from "./notification.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const LEARNER = "learner-1";
const LEARNER_B = "learner-2";

const makePrisma = () =>
  ({
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  }) as unknown as PrismaService;

describe("NotificationService", () => {
  let prisma: PrismaService;
  let service: NotificationService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new NotificationService(prisma);
  });

  it("push — crée une notification", async () => {
    (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "notif-1", learner_id: LEARNER,
      type: "streak_reminder", payload: {}, read: false, created_at: new Date(),
    });

    const notif = await service.push({
      learner_id: LEARNER, type: "streak_reminder", payload: { days: 5 },
    });

    expect(notif.type).toBe("streak_reminder");
    expect(notif.read).toBe(false);
  });

  it("list — retourne les notifications non lues du learner", async () => {
    (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "n1", type: "buddy_request", read: false },
      { id: "n2", type: "stamp_expiring", read: false },
    ]);

    const list = await service.list(LEARNER, { unread_only: true });

    expect(list).toHaveLength(2);
    const call = (prisma.notification.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.read).toBe(false);
  });

  it("markRead — marque toutes les notifications du learner comme lues", async () => {
    (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

    const result = await service.markRead(LEARNER);
    expect(result.count).toBe(3);
  });

  it("it_does_not_leak_across_tenants — notifications scopées par learner", async () => {
    (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.list(LEARNER_B, {});

    const call = (prisma.notification.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.learner_id).toBe(LEARNER_B);
  });
});
