import {
  Controller,
  Get,
  Param,
  Res,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { AuditService } from "./audit.service.js";
import { CertificateService } from "./certificate.service.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";

// Refs: SPEC.md R-1.5, R-4.3

@Controller("audit")
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly certificateService: CertificateService,
  ) {}

  @Get("stamps/:stampId/proof")
  @RequirePermissions("certificate.download")
  async getProof(
    @Param("stampId") stampId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    const data = await this.auditService.getStampWithProof(stampId);
    this.assertOwnerOrAdmin(data.stamp, caller);
    return data;
  }

  @Get("stamps/:stampId/certificate")
  @RequirePermissions("certificate.download")
  async downloadCertificate(
    @Param("stampId") stampId: string,
    @Res() res: Response,
    @CurrentUser() caller: AuthUser,
  ) {
    const { stamp, proof } = await this.auditService.getStampWithProof(stampId);
    this.assertOwnerOrAdmin(stamp, caller);
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

  @Get("learners/:learnerId/export")
  @RequirePermissions("audit.export")
  async exportLearnerBundle(
    @Param("learnerId") learnerId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.auditService.exportLearnerAuditBundle(learnerId, caller.user_id);
  }

  private assertOwnerOrAdmin(stamp: any, caller: AuthUser): void {
    if (caller.permissions.includes("audit.export")) return;
    if (stamp.learner?.user_id === caller.user_id) return;
    throw new ForbiddenException("Access denied to this certificate");
  }
}
