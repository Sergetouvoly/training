import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RoleService } from "./role.service.js";
import { RoleController, UserRoleController, PermissionController } from "./role.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [RoleController, UserRoleController, PermissionController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
