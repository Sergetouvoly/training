import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { GdprService } from "./gdpr.service.js";
import { AdminService } from "./admin.service.js";
import { UserController } from "./user.controller.js";
import { UserPermissionController } from "./user-permission.controller.js";
import { UserPermissionService } from "./user-permission.service.js";
import { MfaService } from "../auth/mfa.service.js";
import { OnboardingService } from "./onboarding.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [UserController, UserPermissionController],
  providers: [GdprService, AdminService, MfaService, UserPermissionService, OnboardingService],
  exports: [AdminService, MfaService, OnboardingService],
})
export class UserModule {}
