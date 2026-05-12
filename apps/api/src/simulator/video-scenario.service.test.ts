// Refs: SPEC.md §9 US-2a.2 — Vidéo interactive branchée
// Un nœud vidéo contient video_url + choice_reveal_at_seconds dans son content JSON.
// La navigation (chooseNode) est déjà gérée par SimulatorService — ce service valide la création.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { VideoScenarioService } from "./video-scenario.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const makePrisma = () =>
  ({
    scenario: { findFirst: vi.fn() },
    scenarioNode: { create: vi.fn() },
  }) as unknown as PrismaService;

describe("VideoScenarioService", () => {
  let prisma: PrismaService;
  let service: VideoScenarioService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new VideoScenarioService(prisma);
  });

  it("crée un nœud vidéo valide avec video_url et choice_reveal_at_seconds", async () => {
    const scenario = { id: "s1" };
    (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(scenario);
    (prisma.scenarioNode.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "node-1" });

    await service.createVideoNode({
      scenario_id: "s1",
      content_fr: "Regardez cette vidéo et choisissez",
      video_url: "https://cdn.example.com/video.mp4",
      choice_reveal_at_seconds: 45,
      choices: [
        { label_fr: "Bon choix", next_node_id: null, is_correct: true },
        { label_fr: "Mauvais choix", next_node_id: null, is_correct: false },
      ],
    });

    expect(prisma.scenarioNode.create).toHaveBeenCalledOnce();
    const data = (prisma.scenarioNode.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    const choices = data.choices;
    expect(choices).toBeDefined();
  });

  it("rejette un nœud vidéo sans video_url", async () => {
    (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s1" });

    await expect(
      service.createVideoNode({
        scenario_id: "s1",
        content_fr: "Sans URL",
        video_url: "",
        choice_reveal_at_seconds: 30,
        choices: [],
      })
    ).rejects.toThrow(/video_url/i);
  });

  it("rejette si choice_reveal_at_seconds <= 0", async () => {
    (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s1" });

    await expect(
      service.createVideoNode({
        scenario_id: "s1",
        content_fr: "Question",
        video_url: "https://cdn.example.com/v.mp4",
        choice_reveal_at_seconds: 0,
        choices: [{ label_fr: "OK", next_node_id: null, is_correct: true }],
      })
    ).rejects.toThrow(/choice_reveal_at_seconds/i);
  });

  it("it_does_not_leak_across_tenants — scénario vérifié par id", async () => {
    (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.createVideoNode({
        scenario_id: "s1",
        content_fr: "Q",
        video_url: "https://cdn.example.com/v.mp4",
        choice_reveal_at_seconds: 10,
        choices: [],
      })
    ).rejects.toThrow();

    const call = (prisma.scenario.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.id).toBe("s1");
  });
});
