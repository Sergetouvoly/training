import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { GdprService } from "./gdpr.service.js";
import { AdminService } from "./admin.service.js";
import { UserController } from "./user.controller.js";
import { MfaService } from "../auth/mfa.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [GdprService, AdminService, MfaService],
  exports: [AdminService, MfaService],
})
export class UserModule {}
