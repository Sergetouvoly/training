// Refs: SPEC.md §4, R-3.2, R-3.3
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RagService } from "./rag.service.js";
import { AiService } from "./ai.service.js";
import { AiCitationError } from "./types.js";
import type { VectorStore, RagDocument } from "./rag.service.js";
import type { AiProviderConfig, AiResponse } from "./types.js";

// ─── Stubs ────────────────────────────────────────────────────────────────────

function makeAiServiceStub(responseOverrides: Partial<AiResponse> = {}): AiService {
  const svc = new AiService();
  vi.spyOn(svc, "embed").mockResolvedValue({ embedding: [0.1, 0.2], tokens_used: 10 });
  vi.spyOn(svc, "query").mockResolvedValue({
    content: "Réponse RAG",
    citations: [],
    tokens_used: 50,
    provider: "openai",
    model: "gpt-4o-mini",
    ...responseOverrides,
  });
  return svc;
}

function makeVectorStore(docs: RagDocument[] = []): VectorStore {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(docs),
    deleteByTenant: vi.fn().mockResolvedValue(undefined),
  };
}

const config: AiProviderConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  api_key: "test-key",
  tenant_id: "tenant-a",
};

const sampleDoc: RagDocument = {
  document_id: "doc-1",
  page: 3,
  tenant_id: "tenant-a",
  chunk_text: "Le RGPD impose la minimisation des données personnelles.",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RagService — indexChunk", () => {
  it("embeds and stores a chunk", async () => {
    const ai = makeAiServiceStub();
    const store = makeVectorStore();
    const svc = new RagService(ai, store);

    await svc.indexChunk(
      { document_id: "doc-1", page: 1, tenant_id: "tenant-a", chunk_text: "RGPD art. 5" },
      config,
    );

    expect(ai.embed).toHaveBeenCalledOnce();
    expect(store.upsert).toHaveBeenCalledOnce();
  });

  it("rejects when chunk.tenant_id !== config.tenant_id (R-3.3)", async () => {
    const ai = makeAiServiceStub();
    const store = makeVectorStore();
    const svc = new RagService(ai, store);

    await expect(
      svc.indexChunk(
        { document_id: "doc-1", page: 1, tenant_id: "tenant-b", chunk_text: "..." },
        config, // config.tenant_id = "tenant-a"
      ),
    ).rejects.toThrow("tenant_id mismatch");
  });
});

describe("RagService — query", () => {
  it("returns response with citations injected from retrieved docs (R-3.2)", async () => {
    const ai = makeAiServiceStub();
    const store = makeVectorStore([sampleDoc]);
    const svc = new RagService(ai, store);

    const response = await svc.query(
      {
        action: "quel_chapitre_revoir",
        context: "Score 45% RGPD",
        tenant_id: "tenant-a",
        learner_id: "learner-1",
      },
      config,
    );

    expect(response.citations).toHaveLength(1);
    expect(response.citations[0]?.document_id).toBe("doc-1");
    expect(response.citations[0]?.page).toBe(3);
    expect(response.citations[0]?.tenant_id).toBe("tenant-a");
  });

  it("throws AiCitationError when no documents found in collection (R-3.2)", async () => {
    const ai = makeAiServiceStub();
    const store = makeVectorStore([]); // empty collection
    const svc = new RagService(ai, store);

    await expect(
      svc.query(
        { action: "expliquer_ce_concept", context: "...", tenant_id: "tenant-a", learner_id: "l1" },
        config,
      ),
    ).rejects.toThrow(AiCitationError);
  });

  it("does not_leak_across_tenants — search scoped to tenant_id (R-3.3)", async () => {
    const ai = makeAiServiceStub();
    const store = makeVectorStore([sampleDoc]);
    const svc = new RagService(ai, store);

    await svc.query(
      { action: "quel_chapitre_revoir", context: "...", tenant_id: "tenant-a", learner_id: "l1" },
      config,
    );

    expect(store.search).toHaveBeenCalledWith(
      expect.any(Array),
      "tenant-a",
      5,
    );
  });

  it("rejects when ragQuery.tenant_id !== config.tenant_id (R-3.3)", async () => {
    const ai = makeAiServiceStub();
    const store = makeVectorStore([sampleDoc]);
    const svc = new RagService(ai, store);

    await expect(
      svc.query(
        { action: "quel_chapitre_revoir", context: "...", tenant_id: "tenant-b", learner_id: "l1" },
        config, // config.tenant_id = "tenant-a"
      ),
    ).rejects.toThrow("tenant_id mismatch");
  });
});
