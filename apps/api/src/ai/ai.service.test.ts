// Refs: SPEC.md §9 US-3.1–US-3.4, R-3.1, R-3.2, R-3.3
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiNestService } from "./ai.service.js";
import { AiCitationError } from "@elearning/ai";

// ─── Stubs ────────────────────────────────────────────────────────────────────

function makePrismaStub() {
  return {
    appConfig: {
      findMany: vi.fn().mockResolvedValue([
        { key: "llm_provider", value: "openai" },
        { key: "llm_model", value: "gpt-4o-mini" },
        { key: "llm_max_tokens_per_call", value: 500 },
        { key: "llm_max_tokens_per_user_day", value: 1000 },
      ]),
    },
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([
      {
        document_id: "doc-1",
        page: 2,
        chunk_text: "Le RGPD impose la minimisation des données personnelles.",
      },
    ]),
  } as any;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiNestService — query (R-3.1, R-3.2, R-3.3)", () => {
  let prisma: ReturnType<typeof makePrismaStub>;
  let svc: AiNestService;

  beforeEach(() => {
    prisma = makePrismaStub();
    svc = new AiNestService(prisma);

    // Stub core AI calls — we are testing orchestration, not the LLM
    vi.spyOn((svc as any).core, "embed").mockResolvedValue({
      embedding: [0.1, 0.2],
      tokens_used: 10,
    });
    vi.spyOn((svc as any).core, "query").mockResolvedValue({
      content: "Réponse RAG",
      citations: [],
      tokens_used: 50,
      provider: "openai",
      model: "gpt-4o-mini",
    });
  });

  it("returns response with citations from vector store (R-3.2)", async () => {
    const response = await svc.query({
      action: "quel_chapitre_revoir",
      context: "Score 45% RGPD",
      learner_id: "learner-1",
    });

    expect(response.citations).toHaveLength(1);
    expect(response.citations[0]?.document_id).toBe("doc-1");
  });

  it("throws AiCitationError when vector store returns no docs (R-3.2)", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(
      svc.query({
        action: "expliquer_ce_concept",
        context: "...",
        learner_id: "learner-1",
      }),
    ).rejects.toThrow(AiCitationError);
  });

  it("resolves config from appConfig table (llm_provider, llm_model)", async () => {
    await svc.query({
      action: "quel_chapitre_revoir",
      context: "...",
      learner_id: "learner-1",
    });

    expect(prisma.appConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ key: expect.anything() }),
      }),
    );
  });

  it("getTokensUsed returns 0 initially", () => {
    expect(svc.getTokensUsed("learner-1")).toBe(0);
  });
});

describe("AiNestService — indexDocument", () => {
  it("calls embed and upsert (R-3.3)", async () => {
    const prisma = makePrismaStub();
    const svc = new AiNestService(prisma);

    vi.spyOn((svc as any).core, "embed").mockResolvedValue({
      embedding: [0.5, 0.6],
      tokens_used: 8,
    });

    await svc.indexDocument({
      document_id: "doc-rgpd",
      page: 1,
      chunk_text: "Article 5 RGPD — principes relatifs au traitement.",
    });

    expect((svc as any).core.embed).toHaveBeenCalledOnce();
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
  });
});
