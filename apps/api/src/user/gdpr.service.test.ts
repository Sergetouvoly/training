// Refs: SPEC.md §9 US-1.4 — Export RGPD JSON
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { GdprService } from "./gdpr.service.js";

function makePrisma() {
  return {
    user: { findUnique: vi.fn() },
    stamp: { findMany: vi.fn() },
    domainEvent: { findMany: vi.fn() },
  } as any;
}

const mockUser = {
  id: "u1",
  email: "alice@holenek.fr",
  display_name: "Alice",
  platform_role: "learner",
  created_at: new Date("2026-01-01"),
  learner: { id: "l1", job_role: "hr", team_id: null },
};

const mockStamp = {
  id: "stamp-1",
  learner_id: "l1",
  competence_id: "c1",
  state: "green",
  validated_at: new Date("2026-06-01"),
  expires_at: new Date("2027-06-01"),
  performance_score: 85,
  attempts: 1,
};

describe("GdprService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: GdprService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new GdprService(prisma);
  });

  it("returns a complete RGPD bundle for the user", async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.stamp.findMany.mockResolvedValue([mockStamp]);
    prisma.domainEvent.findMany.mockResolvedValue([]);

    const bundle = await service.exportLearnerData("u1");

    expect(bundle.user.id).toBe("u1");
    expect(bundle.user.email).toBe("alice@holenek.fr");
    expect(bundle.learner?.job_role).toBe("hr");
    expect(bundle.stamps).toHaveLength(1);
    expect(bundle.exported_at).toBeDefined();
  });

  it("stamps are empty for user without learner profile", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...mockUser, learner: null });
    prisma.stamp.findMany.mockResolvedValue([]);
    prisma.domainEvent.findMany.mockResolvedValue([]);

    const bundle = await service.exportLearnerData("u1");

    expect(bundle.learner).toBeNull();
    expect(bundle.stamps).toHaveLength(0);
  });

  it("throws NotFoundException when user not found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.exportLearnerData("unknown")).rejects.toThrow(NotFoundException);
  });
});
