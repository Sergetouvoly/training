import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { GdprService } from "./gdpr.service.js";
import { AdminService } from "./admin.service.js";
import { UserController } from "./user.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [GdprService, AdminService],
  exports: [AdminService],
})
export class UserModule {}
