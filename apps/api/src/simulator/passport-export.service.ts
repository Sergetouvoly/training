import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PassportService } from "./passport.service.js";

// Refs: SPEC.md §9 US-2a.4 — Export Passport partageable
// Snapshot JSON signé SHA-256 — même principe que AuditProofBundle (BLOC 6)
// R-2a.1 : mastery_score absent du snapshot

@Injectable()
export class PassportExportService {
  constructor(private readonly passportService: PassportService) {}

  async exportPassport(learnerId: string) {
    const passport = await this.passportService.getPassport(learnerId);

    const exportedAt = new Date().toISOString();

    const stablePayload = {
      learner_id: passport.learner_id,
      stamps: passport.stamps,
      streak: passport.streak,
    };

    const payloadHash = createHash("sha256")
      .update(JSON.stringify(stablePayload))
      .digest("hex");

    return {
      ...stablePayload,
      exported_at: exportedAt,
      payload_hash: payloadHash,
    };
  }
}
