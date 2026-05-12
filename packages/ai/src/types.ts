// Refs: SPEC.md §3 L3, R-3.1, R-3.2, R-3.3

export type LlmProviderName = "openai" | "mistral" | "ollama" | "azure_openai";

export interface AiProviderConfig {
  readonly provider: LlmProviderName;
  readonly model: string;
  readonly api_key?: string;
  readonly base_url?: string;
  readonly tenant_id: string;
}

export interface AiCitation {
  readonly document_id: string;
  readonly page: number;
  readonly tenant_id: string;
  readonly excerpt?: string;
}

export interface AiResponse {
  readonly content: string;
  readonly citations: readonly AiCitation[];
  readonly tokens_used: number;
  readonly provider: LlmProviderName;
  readonly model: string;
}

export interface AiEmbeddingResponse {
  readonly embedding: readonly number[];
  readonly tokens_used: number;
}

export interface CompleteOptions {
  readonly system?: string;
  readonly max_tokens?: number;
  readonly temperature?: number;
}

// R-3.1 — no free prompt, only predefined action buttons
export type PredefinedAction =
  | "quel_chapitre_revoir"       // US-3.1
  | "expliquer_ce_concept"       // US-3.2
  | "generer_micro_module"       // US-3.3
  | "cas_pratique_secteur";      // US-3.4

export interface RagQuery {
  readonly action: PredefinedAction;
  readonly context: string;
  readonly tenant_id: string;
  readonly learner_id: string;
  readonly competence_id?: string;
}

// R-3.3 — token budget: per-call + per-user-day
export interface TokenBudget {
  readonly max_tokens_per_call: number;
  readonly max_tokens_per_user_day: number;
}

export const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  max_tokens_per_call: 2000,
  max_tokens_per_user_day: 20000,
};

export class AiCitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiCitationError";
  }
}

export class TokenBudgetExceededError extends Error {
  constructor(
    public readonly kind: "per_call" | "per_user_day",
    public readonly limit: number,
    public readonly used: number,
  ) {
    super(`Token budget exceeded (${kind}): limit=${limit}, used=${used}`);
    this.name = "TokenBudgetExceededError";
  }
}
