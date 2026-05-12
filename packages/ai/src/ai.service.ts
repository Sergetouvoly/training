// Refs: SPEC.md §3 L3, R-3.1, R-3.2, R-3.3
import type { AiProvider } from "./provider.interface.js";
import type {
  AiProviderConfig,
  AiResponse,
  AiEmbeddingResponse,
  CompleteOptions,
  TokenBudget,
  RagQuery,
} from "./types.js";
import {
  DEFAULT_TOKEN_BUDGET,
  AiCitationError,
  TokenBudgetExceededError,
} from "./types.js";
import { OpenAiProvider } from "./providers/openai.provider.js";
import { MistralProvider } from "./providers/mistral.provider.js";
import { OllamaProvider } from "./providers/ollama.provider.js";

// In-memory token usage tracker (per-user-day). Production: back by Redis/PG.
const userDayUsage = new Map<string, number>();

function userDayKey(tenant_id: string, learner_id: string, date: string): string {
  return `${tenant_id}:${learner_id}:${date}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const PROVIDERS: Record<string, AiProvider> = {
  openai: new OpenAiProvider(),
  mistral: new MistralProvider(),
  ollama: new OllamaProvider(),
  azure_openai: new OpenAiProvider(), // Azure = OpenAI-compatible
};

export class AiService {
  private readonly budget: TokenBudget;

  constructor(budget: TokenBudget = DEFAULT_TOKEN_BUDGET) {
    this.budget = budget;
  }

  // R-3.1 — entry point for predefined-action RAG queries only
  async query(ragQuery: RagQuery, config: AiProviderConfig): Promise<AiResponse> {
    const systemPrompt = this.buildSystemPrompt(ragQuery);
    const contextPrompt = ragQuery.context;
    return this.complete(
      contextPrompt,
      { system: systemPrompt, max_tokens: this.budget.max_tokens_per_call },
      config,
      ragQuery.learner_id,
    );
  }

  async complete(
    prompt: string,
    options: CompleteOptions,
    config: AiProviderConfig,
    learner_id?: string,
  ): Promise<AiResponse> {
    const maxTokens = options.max_tokens ?? this.budget.max_tokens_per_call;

    if (maxTokens > this.budget.max_tokens_per_call) {
      throw new TokenBudgetExceededError("per_call", this.budget.max_tokens_per_call, maxTokens);
    }

    if (learner_id) {
      const key = userDayKey(config.tenant_id, learner_id, todayIso());
      const used = userDayUsage.get(key) ?? 0;
      if (used + maxTokens > this.budget.max_tokens_per_user_day) {
        throw new TokenBudgetExceededError(
          "per_user_day",
          this.budget.max_tokens_per_user_day,
          used + maxTokens,
        );
      }
    }

    const provider = this.getProvider(config.provider);
    const response = await provider.complete(prompt, { ...options, max_tokens: maxTokens }, config);

    if (learner_id) {
      const key = userDayKey(config.tenant_id, learner_id, todayIso());
      userDayUsage.set(key, (userDayUsage.get(key) ?? 0) + response.tokens_used);
    }

    // R-3.2 — citations mandatory for RAG responses; callers injecting citations must pass them
    return response;
  }

  async embed(text: string, config: AiProviderConfig): Promise<AiEmbeddingResponse> {
    const provider = this.getProvider(config.provider);
    return provider.embed(text, config);
  }

  // R-3.2 — reject response with no citations when citations are expected
  assertCitations(response: AiResponse): void {
    if (response.citations.length === 0) {
      throw new AiCitationError(
        "AiCitationFailed: response has no citations. All AI responses must cite source documents (R-3.2).",
      );
    }
  }

  getUserDayTokensUsed(tenant_id: string, learner_id: string): number {
    const key = userDayKey(tenant_id, learner_id, todayIso());
    return userDayUsage.get(key) ?? 0;
  }

  // Visible for testing
  resetUserDayUsage(): void {
    userDayUsage.clear();
  }

  private getProvider(name: string): AiProvider {
    const provider = PROVIDERS[name];
    if (!provider) throw new Error(`Unknown AI provider: ${name}`);
    return provider;
  }

  private buildSystemPrompt(query: RagQuery): string {
    const instructions: Record<string, string> = {
      quel_chapitre_revoir:
        "Identifie les chapitres à revoir en te basant uniquement sur les sources fournies. Cite chaque source (document_id + page).",
      expliquer_ce_concept:
        "Explique le concept en te basant uniquement sur les sources fournies. Cite chaque source (document_id + page).",
      generer_micro_module:
        "Génère un micro-module de remédiation en te basant uniquement sur les sources fournies. Cite chaque source (document_id + page).",
      cas_pratique_secteur:
        "Propose un cas pratique sectoriel en te basant uniquement sur les sources fournies. Cite chaque source (document_id + page).",
    };
    return instructions[query.action] ?? "Réponds en citant chaque source (document_id + page).";
  }
}
