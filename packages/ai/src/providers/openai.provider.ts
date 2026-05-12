// Refs: SPEC.md §3 L3, TBD-3.1 RESOLVED
import type { AiProvider } from "../provider.interface.js";
import type {
  AiResponse,
  AiEmbeddingResponse,
  CompleteOptions,
  AiProviderConfig,
} from "../types.js";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  async complete(
    prompt: string,
    options: CompleteOptions,
    config: AiProviderConfig,
  ): Promise<AiResponse> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: config.api_key,
      baseURL: config.base_url,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        ...(options.system ? [{ role: "system" as const, content: options.system }] : []),
        { role: "user" as const, content: prompt },
      ],
      max_tokens: options.max_tokens,
      temperature: options.temperature,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const tokens_used = response.usage?.total_tokens ?? 0;

    return {
      content,
      citations: [],
      tokens_used,
      provider: "openai",
      model: config.model,
    };
  }

  async embed(text: string, config: AiProviderConfig): Promise<AiEmbeddingResponse> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: config.api_key,
      baseURL: config.base_url,
    });

    const response = await client.embeddings.create({
      model: config.model,
      input: text,
    });

    return {
      embedding: response.data[0]?.embedding ?? [],
      tokens_used: response.usage?.total_tokens ?? 0,
    };
  }
}
