// Refs: SPEC.md §4, R-3.2, R-3.3 — RAG pipeline tenant-scopé
import type { AiService } from "./ai.service.js";
import type { AiProviderConfig, AiResponse, AiCitation, RagQuery } from "./types.js";
import { AiCitationError } from "./types.js";

export interface RagDocument {
  readonly document_id: string;
  readonly page: number;
  readonly tenant_id: string;
  readonly chunk_text: string;
  readonly embedding?: readonly number[];
}

export interface VectorStore {
  // R-3.3 — all operations strictly scoped by tenant_id
  upsert(doc: RagDocument): Promise<void>;
  search(
    embedding: readonly number[],
    tenant_id: string,
    top_k?: number,
  ): Promise<readonly RagDocument[]>;
  deleteByTenant(tenant_id: string): Promise<void>;
}

export class RagService {
  constructor(
    private readonly ai: AiService,
    private readonly store: VectorStore,
  ) {}

  // Index a document chunk — R-3.3 tenant isolation enforced
  async indexChunk(chunk: Omit<RagDocument, "embedding">, config: AiProviderConfig): Promise<void> {
    if (chunk.tenant_id !== config.tenant_id) {
      throw new Error(
        `tenant_id mismatch: chunk.tenant_id=${chunk.tenant_id} vs config.tenant_id=${config.tenant_id}`,
      );
    }
    const { embedding } = await this.ai.embed(chunk.chunk_text, config);
    await this.store.upsert({ ...chunk, embedding });
  }

  // RAG query — retrieves context, calls LLM, injects citations, asserts R-3.2
  async query(ragQuery: RagQuery, config: AiProviderConfig): Promise<AiResponse> {
    if (ragQuery.tenant_id !== config.tenant_id) {
      throw new Error(
        `tenant_id mismatch: ragQuery.tenant_id=${ragQuery.tenant_id} vs config.tenant_id=${config.tenant_id}`,
      );
    }

    const queryEmbedding = await this.ai.embed(ragQuery.context, config);
    const docs = await this.store.search(queryEmbedding.embedding, ragQuery.tenant_id, 5);

    if (docs.length === 0) {
      throw new AiCitationError(
        "AiCitationFailed: no documents found in tenant collection. Cannot answer without sources (R-3.2).",
      );
    }

    const contextWithSources = docs
      .map((d) => `[Source: ${d.document_id} p.${d.page}]\n${d.chunk_text}`)
      .join("\n\n");

    const citations: readonly AiCitation[] = docs.map((d) => ({
      document_id: d.document_id,
      page: d.page,
      tenant_id: d.tenant_id,
      excerpt: d.chunk_text.slice(0, 200),
    }));

    const enrichedQuery: RagQuery = {
      ...ragQuery,
      context: contextWithSources,
    };

    const rawResponse = await this.ai.query(enrichedQuery, config);

    // Inject citations from retrieved docs
    const response: AiResponse = {
      ...rawResponse,
      citations,
    };

    // R-3.2 — hard reject if no citations
    this.ai.assertCitations(response);

    return response;
  }
}
