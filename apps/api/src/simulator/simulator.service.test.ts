// Refs: SPEC.md §9 US-2a.1 — Scénario solo arbre de décision
// Test écrit avant le code (SPEC → Test → Code)
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SimulatorService } from "./simulator.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const LEARNER = "learner-1";

const rootNode = {
  id: "node-root",
  scenario_id: "scenario-1",
  content_fr: "Vous recevez un email suspect. Que faites-vous ?",
  is_terminal: false,
  choices: [
    { label_fr: "Cliquer sur le lien", next_node_id: "node-bad", is_correct: false },
    { label_fr: "Signaler au RSSI", next_node_id: "node-good", is_correct: true },
  ],
  created_at: new Date(),
};

const goodNode = {
  id: "node-good",
  scenario_id: "scenario-1",
  content_fr: "Bien joué ! Le RSSI confirme que c'était du phishing.",
  is_terminal: true,
  choices: [],
  created_at: new Date(),
};

const badNode = {
  id: "node-bad",
  scenario_id: "scenario-1",
  content_fr: "Vous avez cliqué sur un lien malveillant.",
  is_terminal: true,
  choices: [],
  created_at: new Date(),
};

const scenario = {
  id: "scenario-1",
  title_fr: "Phishing détection",
  root_node_id: "node-root",
};

const makePrisma = () =>
  ({
    scenario: { findFirst: vi.fn() },
    scenarioNode: { findFirst: vi.fn(), findMany: vi.fn() },
    scenarioSession: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    domainEvent: { create: vi.fn() },
  }) as unknown as PrismaService;

describe("SimulatorService", () => {
  let prisma: PrismaService;
  let service: SimulatorService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SimulatorService(prisma);
  });

  it("startSession — crée une session sur le nœud racine", async () => {
    (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(scenario);
    (prisma.scenarioNode.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(rootNode);
    (prisma.scenarioSession.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "session-1",
      scenario_id: "scenario-1",
      learner_id: LEARNER,
      current_node_id: "node-root",
      path_taken: [],
      completed: false,
      score: null,
      started_at: new Date(),
      completed_at: null,
    });

    const session = await service.startSession({ scenario_id: "scenario-1", learner_id: LEARNER });

    expect(session.current_node_id).toBe("node-root");
    expect(session.completed).toBe(false);
  });

  it("chooseNode — avance vers le nœud suivant", async () => {
    const session = {
      id: "session-1",
      scenario_id: "scenario-1",
      learner_id: LEARNER,
      current_node_id: "node-root",
      path_taken: [],
      completed: false,
      score: null,
      started_at: new Date(),
      completed_at: null,
    };

    (prisma.scenarioSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(session);
    (prisma.scenarioNode.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(rootNode)   // current node
      .mockResolvedValueOnce(goodNode);  // next node
    (prisma.scenarioSession.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...session,
      current_node_id: "node-good",
      path_taken: [{ node_id: "node-root", choice_index: 1, chosen_at: new Date().toISOString() }],
    });

    const result = await service.chooseNode("session-1", { choice_index: 1 });
    expect(result.current_node_id).toBe("node-good");
  });

  it("chooseNode — complète la session sur nœud terminal et émet CrisisScenarioCompleted", async () => {
    const session = {
      id: "session-1",
      scenario_id: "scenario-1",
      learner_id: LEARNER,
      current_node_id: "node-root",
      path_taken: [],
      completed: false,
      score: null,
      started_at: new Date(),
      completed_at: null,
    };

    (prisma.scenarioSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(session);
    (prisma.scenarioNode.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(rootNode)
      .mockResolvedValueOnce(goodNode); // terminal
    (prisma.scenarioSession.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...session,
      current_node_id: null,
      completed: true,
      score: 100,
      path_taken: [{ node_id: "node-root", choice_index: 1, chosen_at: new Date().toISOString() }],
    });
    (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await service.chooseNode("session-1", { choice_index: 1 });

    expect(result.completed).toBe(true);
    expect(result.score).toBe(100);
    expect(prisma.domainEvent.create).toHaveBeenCalledOnce();
    const evt = (prisma.domainEvent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(evt.event_name).toBe("CrisisScenarioCompleted");
  });

  it("it_does_not_leak_across_tenants — startSession scope session par learner", async () => {
    (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.startSession({ scenario_id: "scenario-1", learner_id: "learner-2" }))
      .rejects.toThrow();

    const call = (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.id).toBe("scenario-1");
  });

  it("it_does_not_leak_across_tenants — chooseNode scope session par learner", async () => {
    (prisma.scenarioSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.chooseNode("session-1", { choice_index: 0 }))
      .rejects.toThrow();

    const call = (prisma.scenarioSession.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.id).toBe("session-1");
  });
});
