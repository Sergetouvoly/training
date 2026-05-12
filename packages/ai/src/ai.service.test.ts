// Refs: SPEC.md §3 R-3.1, R-3.2, R-3.3
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiService } from "./ai.service.js";
import {
  AiCitationError,
  TokenBudgetExceededError,
  DEFAULT_TOKEN_BUDGET,
} from "./types.js";
import type { AiProviderConfig, AiResponse } from "./types.js";
import type { AiProvider } from "./provider.interface.js";

// ─── Stub provider ────────────────────────────────────────────────────────────

function makeStubProvider(
  overrides: Partial<{
    content: string;
    citations: AiResponse["citations"];
    tokens_used: number;
  }> = {},
): AiProvider {
  return {
    name: "openai",
    complete: vi.fn().mockResolvedValue({
      content: overrides.content ?? "Réponse test",
      citations: overrides.citations ?? [],
      tokens_used: overrides.tokens_used ?? 100,
      provider: "openai",
      model: "gpt-4o-mini",
    }),
    embed: vi.fn().mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      tokens_used: 10,
    }),
  };
}

const config: AiProviderConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  api_key: "test-key",
  tenant_id: "tenant-a",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiService — R-3.1 predefined actions only", () => {
  it("query accepts predefined action and returns a response", async () => {
    const svc = new AiService();
    // We stub the internal provider via complete — test the shape, not the call
    vi.spyOn(svc as any, "complete").mockResolvedValue({
      content: "Réponse RAG",
      citations: [{ document_id: "doc-1", page: 3, tenant_id: "tenant-a" }],
      tokens_used: 50,
      provider: "openai",
      model: "gpt-4o-mini",
    } satisfies AiResponse);

    const response = await svc.query(
      {
        action: "quel_chapitre_revoir",
        context: "Score 45% sur RGPD",
        tenant_id: "tenant-a",
        learner_id: "learner-1",
        competence_id: "comp-1",
      },
      config,
    );

    expect(response.content).toBe("Réponse RAG");
    expect(response.citations).toHaveLength(1);
  });
});

describe("AiService — R-3.2 citations obligatoires", () => {
  it("assertCitations throws AiCitationError when no citations", () => {
    const svc = new AiService();
    const response: AiResponse = {
      content: "Réponse sans citation",
      citations: [],
      tokens_used: 100,
      provider: "openai",
      model: "gpt-4o-mini",
    };
    expect(() => svc.assertCitations(response)).toThrow(AiCitationError);
  });

  it("assertCitations passes when citations are present", () => {
    const svc = new AiService();
    const response: AiResponse = {
      content: "Réponse avec citation",
      citations: [{ document_id: "doc-1", page: 2, tenant_id: "tenant-a" }],
      tokens_used: 100,
      provider: "openai",
      model: "gpt-4o-mini",
    };
    expect(() => svc.assertCitations(response)).not.toThrow();
  });
});

describe("AiService — R-3.3 token budgets", () => {
  let svc: AiService;

  beforeEach(() => {
    svc = new AiService({ max_tokens_per_call: 500, max_tokens_per_user_day: 1000 });
    svc.resetUserDayUsage();
  });

  it("rejects a call that exceeds per_call budget", async () => {
    vi.spyOn(svc as any, "getProvider").mockReturnValue(makeStubProvider({ tokens_used: 600 }));

    await expect(
      svc.complete("prompt", { max_tokens: 600 }, config, "learner-1"),
    ).rejects.toThrow(TokenBudgetExceededError);
  });

  it("rejects when accumulated user-day usage would exceed daily budget", async () => {
    // simulate 900 tokens already used today
    vi.spyOn(svc as any, "getProvider").mockReturnValue(makeStubProvider({ tokens_used: 100 }));
    await svc.complete("p1", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p2", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p3", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p4", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p5", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p6", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p7", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p8", { max_tokens: 100 }, config, "learner-1");
    await svc.complete("p9", { max_tokens: 100 }, config, "learner-1");

    expect(svc.getUserDayTokensUsed("tenant-a", "learner-1")).toBe(900);

    // next call of 200 tokens = 1100 > 1000
    await expect(
      svc.complete("p10", { max_tokens: 200 }, config, "learner-1"),
    ).rejects.toThrow(TokenBudgetExceededError);
  });

  it("tracks per-user-day usage correctly across calls", async () => {
    vi.spyOn(svc as any, "getProvider").mockReturnValue(makeStubProvider({ tokens_used: 150 }));

    await svc.complete("prompt", { max_tokens: 150 }, config, "learner-1");
    await svc.complete("prompt", { max_tokens: 150 }, config, "learner-1");

    expect(svc.getUserDayTokensUsed("tenant-a", "learner-1")).toBe(300);
  });

  it("does not leak usage across tenants (R-3.3)", async () => {
    vi.spyOn(svc as any, "getProvider").mockReturnValue(makeStubProvider({ tokens_used: 200 }));

    const configB: AiProviderConfig = { ...config, tenant_id: "tenant-b" };

    await svc.complete("prompt", { max_tokens: 200 }, config, "learner-1");
    await svc.complete("prompt", { max_tokens: 200 }, configB, "learner-1");

    expect(svc.getUserDayTokensUsed("tenant-a", "learner-1")).toBe(200);
    expect(svc.getUserDayTokensUsed("tenant-b", "learner-1")).toBe(200);
  });

  it("does not apply budget when no learner_id is given", async () => {
    vi.spyOn(svc as any, "getProvider").mockReturnValue(makeStubProvider({ tokens_used: 499 }));

    // no learner_id → no daily tracking
    await expect(
      svc.complete("prompt", { max_tokens: 499 }, config),
    ).resolves.toBeDefined();
  });
});

describe("AiService — provider selection", () => {
  it("throws for unknown provider", async () => {
    const svc = new AiService();
    const badConfig: AiProviderConfig = {
      ...config,
      provider: "unknown" as any,
    };
    await expect(svc.complete("prompt", {}, badConfig)).rejects.toThrow(
      "Unknown AI provider: unknown",
    );
  });

  it("getUserDayTokensUsed returns 0 for unknown key", () => {
    const svc = new AiService();
    expect(svc.getUserDayTokensUsed("t", "l")).toBe(0);
  });
});
