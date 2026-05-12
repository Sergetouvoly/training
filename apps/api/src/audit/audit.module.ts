import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service.js";
import { CertificateService } from "./certificate.service.js";
import { AuditController } from "./audit.controller.js";

@Module({
  controllers: [AuditController],
  providers: [AuditService, CertificateService],
  exports: [AuditService, CertificateService],
})
export class AuditModule {}
