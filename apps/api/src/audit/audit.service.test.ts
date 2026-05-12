import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { AuditService } from "./audit.service.js";

/**
 * AuditService unit tests.
 * Refs: SPEC.md R-1.5, R-4.3, §6.4, C-1.4
 */

function makePrismaStub() {
  const events: any[] = [];
  return {
    domainEvent: {
      create: vi.fn().mockImplementation(async (args: any) => {
        const e = { ...args.data, occurred_at: new Date() };
        events.push(e);
        return e;
      }),
      findMany: vi.fn().mockImplementation(async (args: any) => {
        return events.filter(
          (e) => e.event_name === args.where.event_name,
        );
      }),
    },
    stamp: {
      findFirst: vi.fn(),
    },
    _events: events,
  } as any;
}

describe("AuditService", () => {
  let service: AuditService;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    service = new AuditService(prisma);
  });

  it("creates a proof bundle with SHA-256 hash and signature (R-1.5)", async () => {
    const bundle = await service.createProof(
      { stamp_id: "s1", learner_id: "l1", score: 95 },
      "module-hash-v1",
      "evaluation-service",
    );

    expect(bundle.payload_hash).toHaveLength(64);
    expect(bundle.signature).toHaveLength(64);
    expect(bundle.content_version_hash).toBe("module-hash-v1");
    expect(bundle.signed_by).toBe("evaluation-service");
    expect(bundle.signed_at).toBeTruthy();
  });

  it("stores proof as immutable log entry in domain_events (§6.4)", async () => {
    await service.createProof(
      { stamp_id: "s1" },
      "hash-v1",
      "test",
    );

    expect(prisma.domainEvent.create).toHaveBeenCalledTimes(1);
    const eventData = prisma.domainEvent.create.mock.calls[0][0].data;
    expect(eventData.event_name).toBe("AuditBundleCreated");
    expect(eventData.payload.payload_hash).toHaveLength(64);
  });

  it("retrieves proof bundle by stamp_id", async () => {
    await service.createProof(
      { stamp_id: "s1", score: 100 },
      "hash-v1",
      "test",
    );

    const proof = await service.getProofByStampId("s1");
    expect(proof).not.toBeNull();
    expect(proof!.payload_hash).toHaveLength(64);
  });

  it("returns null when no proof exists for stamp", async () => {
    const proof = await service.getProofByStampId("nonexistent");
    expect(proof).toBeNull();
  });

  it("throws NotFoundException for unknown stamp in getStampWithProof", async () => {
    prisma.stamp.findFirst.mockResolvedValue(null);
    await expect(service.getStampWithProof("unknown")).rejects.toThrow(NotFoundException);
  });

  it("it_does_not_leak_across_tenants — proof lookup scoped by stamp_id", async () => {
    await service.createProof({ stamp_id: "s1" }, "h1", "test");

    // Proof for s2 should not return s1's data
    const proof = await service.getProofByStampId("s2");
    expect(proof).toBeNull();
  });
});
