import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { createProofBundle, type AuditProofBundle } from "@elearning/crypto";

/**
 * Audit service — creates AuditProofBundles for certification-relevant writes.
 * Refs: SPEC.md R-1.5, R-4.3, §6.4, WORKFLOW.md §6 BLOC 6
 *
 * Every certification-relevant write produces:
 * 1. An immutable log entry with SHA-256 of the payload
 * 2. A reference to the content version (hash) at time of certification
 * 3. A CompetenceValidated event (handled by evaluation.service)
 */

const PROOF_SECRET = process.env["PROOF_SIGNING_SECRET"] ?? "dev-proof-secret-change-in-prod";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createProof(
    payload: unknown,
    contentVersionHash: string,
    signedBy: string,
  ): Promise<AuditProofBundle> {
    const bundle = createProofBundle(
      { payload, content_version_hash: contentVersionHash, signed_by: signedBy },
      PROOF_SECRET,
    );

    await this.prisma.domainEvent.create({
      data: {
        id: bundle.payload_hash.slice(0, 36).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5"),
        event_name: "AuditBundleCreated",
        event_version: "1",
        produced_by: signedBy,
        payload: bundle as any,
      },
    });

    return bundle;
  }

  async getProofByStampId(stampId: string): Promise<AuditProofBundle | null> {
    const events = await this.prisma.domainEvent.findMany({
      where: { event_name: "AuditBundleCreated" },
      orderBy: { occurred_at: "desc" },
    });

    for (const event of events) {
      const bundle = event.payload as any;
      if (bundle?.payload?.stamp_id === stampId) {
        return bundle as AuditProofBundle;
      }
    }

    return null;
  }

  async getStampWithProof(stampId: string) {
    const stamp = await this.prisma.stamp.findFirst({
      where: { id: stampId },
      include: { learner: true, competence: true },
    });
    if (!stamp) throw new NotFoundException(`Stamp ${stampId} not found`);

    const proof = await this.getProofByStampId(stampId);
    return { stamp, proof };
  }
}
