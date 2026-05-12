// Refs: SPEC.md §9 US-2a.6 — Support debrief auto-généré (déterministe, sans LLM Phase 2a)
// R-2a.3 : Orange → suggestion remise à niveau, Rouge → reparcours requis
// R-3.1 bloque le LLM — ce debrief est 100% déterministe basé sur les règles métier
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DebriefService } from "./debrief.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const LEARNER = "learner-1";
const LEARNER_B = "learner-2";

const makePrisma = () =>
  ({
    stamp: { findMany: vi.fn() },
    domainEvent: { findMany: vi.fn() },
  }) as unknown as PrismaService;

const greenStamp = {
  id: "s1", state: "green", performance_score: 88, attempts: 1,
  competence: { code: "RGPD-001", label_fr: "Gestion des données" },
  expires_at: new Date(Date.now() + 86400000 * 300),
};

const orangeStamp = {
  id: "s2", state: "orange", performance_score: 62, attempts: 2,
  competence: { code: "RGPD-002", label_fr: "Droits des personnes" },
  expires_at: new Date(Date.now() + 86400000 * 60),
};

const redStamp = {
  id: "s3", state: "red", performance_score: 40, attempts: 3,
  competence: { code: "SECU-001", label_fr: "Sécurité des accès" },
  expires_at: new Date(Date.now() - 86400000),
};

describe("DebriefService", () => {
  let prisma: PrismaService;
  let service: DebriefService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DebriefService(prisma);
  });

  it("retourne un debrief structuré avec sections par état", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([greenStamp, orangeStamp, redStamp]);
    (prisma.domainEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const debrief = await service.generateDebrief(LEARNER);

    expect(debrief.learner_id).toBe(LEARNER);
    expect(debrief.strengths).toHaveLength(1);    // green
    expect(debrief.to_review).toHaveLength(1);    // orange
    expect(debrief.to_redo).toHaveLength(1);      // red
    expect(debrief.overall_advice).toBeDefined();
  });

  it("R-2a.3 — stamp orange → advice 'remise à niveau suggérée'", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([orangeStamp]);
    (prisma.domainEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const debrief = await service.generateDebrief(LEARNER);

    expect(debrief.to_review[0].advice).toMatch(/remise à niveau/i);
  });

  it("R-2a.3 — stamp rouge → advice 'reparcours requis'", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([redStamp]);
    (prisma.domainEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const debrief = await service.generateDebrief(LEARNER);

    expect(debrief.to_redo[0].advice).toMatch(/reparcours requis/i);
  });

  it("aucun stamp → debrief vide avec encouragement", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.domainEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const debrief = await service.generateDebrief(LEARNER);

    expect(debrief.strengths).toHaveLength(0);
    expect(debrief.to_review).toHaveLength(0);
    expect(debrief.to_redo).toHaveLength(0);
    expect(debrief.overall_advice).toBeDefined();
  });

  it("it_does_not_leak_across_tenants — stamps scopés par learner", async () => {
    (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.domainEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.generateDebrief(LEARNER_B);

    const call = (prisma.stamp.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.learner_id).toBe(LEARNER_B);
  });
});
