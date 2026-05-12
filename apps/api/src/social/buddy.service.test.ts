// Refs: SPEC.md §9 US-2b.3 — Buddy référent informel
// Event BuddyRoleAccepted émis à l'acceptation
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BuddyService } from "./buddy.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const makePrisma = () =>
  ({
    buddyRelation: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    domainEvent: { create: vi.fn() },
  }) as unknown as PrismaService;

describe("BuddyService", () => {
  let prisma: PrismaService;
  let service: BuddyService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BuddyService(prisma);
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("requestBuddy — crée une relation non acceptée", async () => {
    (prisma.buddyRelation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rel-1", learner_id: "l1", buddy_id: "l2", accepted: false,
    });

    const rel = await service.requestBuddy({ learner_id: "l1", buddy_id: "l2" });
    expect(rel.accepted).toBe(false);
    expect(prisma.domainEvent.create).not.toHaveBeenCalled();
  });

  it("acceptBuddy — met à jour la relation et émet BuddyRoleAccepted", async () => {
    (prisma.buddyRelation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rel-1", learner_id: "l1", buddy_id: "l2", accepted: false,
    });
    (prisma.buddyRelation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rel-1", accepted: true, accepted_at: new Date(),
    });

    await service.acceptBuddy("rel-1", "l2");

    expect(prisma.domainEvent.create).toHaveBeenCalledOnce();
    const evt = (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(evt.event_name).toBe("BuddyRoleAccepted");
    expect(evt.payload.relation_id).toBe("rel-1");
  });

  it("acceptBuddy — rejette si ce n'est pas le bon buddy qui accepte", async () => {
    (prisma.buddyRelation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rel-1", learner_id: "l1", buddy_id: "l2", accepted: false,
    });

    await expect(service.acceptBuddy("rel-1", "wrong-user")).rejects.toThrow();
    expect(prisma.domainEvent.create).not.toHaveBeenCalled();
  });

  it("it_does_not_leak_across_tenants — relation scopée par id", async () => {
    (prisma.buddyRelation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.acceptBuddy("rel-99", "l2")).rejects.toThrow();

    const call = (prisma.buddyRelation.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.id).toBe("rel-99");
  });
});
