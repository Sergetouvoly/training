import {
  Controller,
  Get,
  Post,
  Param,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { AuditService } from "./audit.service.js";
import { CertificateService } from "./certificate.service.js";

/**
 * Audit controller — proof bundles + PDF certificates.
 * Refs: SPEC.md R-1.5, R-4.3, C-1.4, WORKFLOW.md §6 BLOC 6
 */
@Controller("audit")
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly certificateService: CertificateService,
  ) {}

  @Get("stamps/:stampId/proof")
  async getProof(@Param("stampId") stampId: string) {
    return this.auditService.getStampWithProof(stampId);
  }

  @Get("stamps/:stampId/certificate")
  async downloadCertificate(
    @Param("stampId") stampId: string,
    @Res() res: Response,
  ) {
    const { stamp, proof } = await this.auditService.getStampWithProof(stampId);
    if (!proof) {
      res.status(404).json({ message: "No proof bundle found for this stamp" });
      return;
    }

    const pdf = await this.certificateService.generatePdf({
      learner_name: (stamp as any).learner?.display_name ?? "Unknown",
      competence_label: (stamp as any).competence?.label_fr ?? "Unknown",
      performance_score: stamp.performance_score,
      validated_at: stamp.validated_at.toISOString(),
      expires_at: stamp.expires_at.toISOString(),
      stamp_id: stamp.id,
      proof,
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=certificate-${stampId}.pdf`,
      "Content-Length": pdf.length.toString(),
    });
    res.end(pdf);
  }
}
