import { describe, it, expect } from "vitest";
import { CertificateService } from "./certificate.service.js";
import type { AuditProofBundle } from "@elearning/crypto";

/**
 * CertificateService unit tests — PDF generation.
 * Refs: SPEC.md R-1.5, WORKFLOW.md §6 BLOC 6
 */

const mockProof: AuditProofBundle = {
  payload: { stamp_id: "s1", score: 95 },
  payload_hash: "a".repeat(64),
  content_version_hash: "module-hash-v1",
  signature: "b".repeat(64),
  signed_at: "2026-05-06T12:00:00.000Z",
  signed_by: "evaluation-service",
};

describe("CertificateService", () => {
  it("generates a PDF buffer (non-empty)", async () => {
    const service = new CertificateService();
    const pdf = await service.generatePdf({
      learner_name: "Jean Dupont",
      competence_label: "Sécurité des données",
      performance_score: 95,
      validated_at: "2026-05-06T12:00:00.000Z",
      expires_at: "2027-05-06T12:00:00.000Z",
      stamp_id: "s1",
      proof: mockProof,
    });

    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it("PDF starts with %PDF header", async () => {
    const service = new CertificateService();
    const pdf = await service.generatePdf({
      learner_name: "Test",
      competence_label: "Test",
      performance_score: 100,
      validated_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2027-01-01T00:00:00.000Z",
      stamp_id: "s1",
      proof: mockProof,
    });

    const header = pdf.subarray(0, 5).toString("utf8");
    expect(header).toBe("%PDF-");
  });
});
