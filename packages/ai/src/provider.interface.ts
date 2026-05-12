// Refs: SPEC.md §3 L3, architecture provider-agnostic (TBD-3.1 RESOLVED)
import type {
  AiResponse,
  AiEmbeddingResponse,
  CompleteOptions,
  AiProviderConfig,
} from "./types.js";

export interface AiProvider {
  readonly name: string;
  complete(
    prompt: string,
    options: CompleteOptions,
    config: AiProviderConfig,
  ): Promise<AiResponse>;
  embed(text: string, config: AiProviderConfig): Promise<AiEmbeddingResponse>;
}
