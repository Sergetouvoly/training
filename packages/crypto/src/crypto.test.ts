import { describe, it, expect } from "vitest";
import { sha256, canonicalize, hashPayload } from "./hash.js";
import { signHmac, verifyHmac } from "./sign.js";
import { createProofBundle, verifyProofBundle } from "./proof.js";

/**
 * Crypto package tests — hash, sign, proof bundle.
 * Refs: SPEC.md R-1.5, R-4.3, WORKFLOW.md §6 BLOC 6
 */

describe("sha256", () => {
  it("produces a 64-char hex string", () => {
    const hash = sha256("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(sha256("test")).toBe(sha256("test"));
  });

  it("different inputs produce different hashes", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });
});

describe("canonicalize", () => {
  it("sorts keys deterministically", () => {
    const a = canonicalize({ b: 2, a: 1 });
    const b = canonicalize({ a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it("produces compact JSON", () => {
    expect(canonicalize({ x: 1 })).toBe('{"x":1}');
  });
});

describe("hashPayload", () => {
  it("produces same hash for objects with different key order", () => {
    const h1 = hashPayload({ b: 2, a: 1 });
    const h2 = hashPayload({ a: 1, b: 2 });
    expect(h1).toBe(h2);
  });
});

describe("signHmac / verifyHmac", () => {
  const secret = "test-secret-key";

  it("sign produces a 64-char hex HMAC", () => {
    const sig = signHmac("data", secret);
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verify returns true for valid signature", () => {
    const sig = signHmac("data", secret);
    expect(verifyHmac("data", sig, secret)).toBe(true);
  });

  it("verify returns false for tampered data", () => {
    const sig = signHmac("data", secret);
    expect(verifyHmac("tampered", sig, secret)).toBe(false);
  });

  it("verify returns false for wrong secret", () => {
    const sig = signHmac("data", secret);
    expect(verifyHmac("data", sig, "wrong-secret")).toBe(false);
  });

  it("verify returns false for tampered signature", () => {
    expect(verifyHmac("data", "0".repeat(64), secret)).toBe(false);
  });
});

describe("AuditProofBundle (C-1.4)", () => {
  const secret = "proof-signing-secret";

  it("creates a valid bundle with hash + signature", () => {
    const bundle = createProofBundle(
      {
        payload: { learner_id: "l1", competence_id: "c1", score: 95 },
        content_version_hash: "module-hash-abc",
        signed_by: "evaluation-service",
      },
      secret,
    );

    expect(bundle.payload_hash).toHaveLength(64);
    expect(bundle.signature).toHaveLength(64);
    expect(bundle.content_version_hash).toBe("module-hash-abc");
    expect(bundle.signed_by).toBe("evaluation-service");
    expect(bundle.signed_at).toBeTruthy();
  });

  it("verifies a valid bundle successfully", () => {
    const bundle = createProofBundle(
      {
        payload: { learner_id: "l1", score: 100 },
        content_version_hash: "hash-v1",
        signed_by: "test",
      },
      secret,
    );

    const result = verifyProofBundle(bundle, secret);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("detects tampered payload", () => {
    const bundle = createProofBundle(
      {
        payload: { learner_id: "l1", score: 100 },
        content_version_hash: "hash-v1",
        signed_by: "test",
      },
      secret,
    );

    const tampered = { ...bundle, payload: { learner_id: "l1", score: 999 } };
    const result = verifyProofBundle(tampered, secret);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Payload hash mismatch"))).toBe(true);
  });

  it("detects tampered signature", () => {
    const bundle = createProofBundle(
      {
        payload: { learner_id: "l1", score: 100 },
        content_version_hash: "hash-v1",
        signed_by: "test",
      },
      secret,
    );

    const tampered = { ...bundle, signature: "0".repeat(64) };
    const result = verifyProofBundle(tampered, secret);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Signature verification failed"))).toBe(true);
  });

  it("detects wrong secret", () => {
    const bundle = createProofBundle(
      {
        payload: { data: "test" },
        content_version_hash: "h1",
        signed_by: "test",
      },
      secret,
    );

    const result = verifyProofBundle(bundle, "wrong-secret");
    expect(result.valid).toBe(false);
  });

  it("detects tampered content_version_hash", () => {
    const bundle = createProofBundle(
      {
        payload: { data: "test" },
        content_version_hash: "original-hash",
        signed_by: "test",
      },
      secret,
    );

    const tampered = { ...bundle, content_version_hash: "tampered-hash" };
    const result = verifyProofBundle(tampered, secret);
    expect(result.valid).toBe(false);
  });

  it("detects tampered timestamp", () => {
    const bundle = createProofBundle(
      {
        payload: { data: "test" },
        content_version_hash: "h1",
        signed_by: "test",
      },
      secret,
    );

    const tampered = { ...bundle, signed_at: "2020-01-01T00:00:00.000Z" };
    const result = verifyProofBundle(tampered, secret);
    expect(result.valid).toBe(false);
  });
});
