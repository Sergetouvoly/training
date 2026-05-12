// Refs: SPEC.md §9 US-3.1–US-3.4, R-3.1, R-3.2, R-3.3
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  AiService as CoreAiService,
  RagService,
  DEFAULT_TOKEN_BUDGET,
} from "@elearning/ai";
import type {
  AiResponse,
  AiProviderConfig,
  LlmProviderName,
  TokenBudget,
  RagQuery,
  PredefinedAction,
  VectorStore,
  RagDocument,
} from "@elearning/ai";

// In-process VectorStore backed by DocumentEmbedding table via raw SQL (pgvector)
class PgVectorStore implements VectorStore {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(doc: RagDocument): Promise<void> {
    const embeddingLiteral = `[${(doc.embedding ?? []).join(",")}]`;
    await this.prisma.$executeRaw`
      INSERT INTO document_embeddings (id, document_id, page, chunk_text, embedding)
      VALUES (gen_random_uuid(), ${doc.document_id}, ${doc.page}, ${doc.chunk_text}, ${embeddingLiteral}::vector)
      ON CONFLICT DO NOTHING
    `;
  }

  async search(
    embedding: readonly number[],
    _tenant_id: string,
    top_k = 5,
  ): Promise<readonly RagDocument[]> {
    const embeddingLiteral = `[${embedding.join(",")}]`;
    const rows = await this.prisma.$queryRaw<
      Array<{ document_id: string; page: number; chunk_text: string }>
    >`
      SELECT document_id, page, chunk_text
      FROM document_embeddings
      ORDER BY embedding <=> ${embeddingLiteral}::vector
      LIMIT ${top_k}
    `;
    return rows.map((r) => ({
      document_id: r.document_id,
      page: r.page,
      chunk_text: r.chunk_text,
      tenant_id: _tenant_id,
    }));
  }

  async deleteByTenant(_tenant_id: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM document_embeddings`;
  }
}

export interface QueryAiDto {
  readonly action: PredefinedAction;
  readonly context: string;
  readonly learner_id: string;
  readonly competence_id?: string;
}

export interface IndexDocumentDto {
  readonly document_id: string;
  readonly page: number;
  readonly chunk_text: string;
}

@Injectable()
export class AiNestService {
  private readonly core: CoreAiService;
  private readonly rag: RagService;

  constructor(private readonly prisma: PrismaService) {
    this.core = new CoreAiService(DEFAULT_TOKEN_BUDGET);
    this.rag = new RagService(this.core, new PgVectorStore(prisma));
  }

  async query(dto: QueryAiDto): Promise<AiResponse> {
    const config = await this.resolveConfig();
    const ragQuery: RagQuery = {
      action: dto.action,
      context: dto.context,
      tenant_id: "holenek",
      learner_id: dto.learner_id,
      competence_id: dto.competence_id,
    };
    return this.rag.query(ragQuery, config);
  }

  async indexDocument(dto: IndexDocumentDto): Promise<void> {
    const config = await this.resolveConfig();
    await this.rag.indexChunk(
      {
        document_id: dto.document_id,
        page: dto.page,
        tenant_id: "holenek",
        chunk_text: dto.chunk_text,
      },
      config,
    );
  }

  getTokensUsed(learnerId: string): number {
    return this.core.getUserDayTokensUsed("holenek", learnerId);
  }

  // Resolves AiProviderConfig from AppConfig — falls back to env vars
  private async resolveConfig(): Promise<AiProviderConfig> {
    const configs = await this.prisma.appConfig.findMany({
      where: {
        key: {
          in: [
            "llm_provider",
            "llm_model",
            "llm_api_key_ref",
            "llm_max_tokens_per_call",
            "llm_max_tokens_per_user_day",
          ],
        },
      },
    });

    const get = (key: string) => configs.find((c) => c.key === key)?.value;

    const provider = ((get("llm_provider") as string | null) ?? process.env["LLM_PROVIDER"] ?? "openai") as LlmProviderName;
    const model = (get("llm_model") as string | null) ?? process.env["LLM_MODEL"] ?? "gpt-4o-mini";
    const apiKeyRef = get("llm_api_key_ref") as string | null;
    const api_key = apiKeyRef ? process.env[apiKeyRef] : process.env["LLM_API_KEY"];

    const budget: TokenBudget = {
      max_tokens_per_call: (get("llm_max_tokens_per_call") as number | null) ?? DEFAULT_TOKEN_BUDGET.max_tokens_per_call,
      max_tokens_per_user_day: (get("llm_max_tokens_per_user_day") as number | null) ?? DEFAULT_TOKEN_BUDGET.max_tokens_per_user_day,
    };

    (this.core as any).budget = budget;

    return { provider, model, api_key, tenant_id: "holenek" };
  }
}
