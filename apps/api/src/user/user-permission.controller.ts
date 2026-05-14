import { Controller, Get, Put, Delete, Param, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";
import { UserPermissionService } from "./user-permission.service.js";

// Refs: SPEC.md §5, §7 — permissions directes sur un utilisateur (grants/denies)

class UpsertUserPermissionDto {
  code!: string;
  type!: "grant" | "deny";
}

@Controller()
export class UserPermissionController {
  constructor(private readonly service: UserPermissionService) {}

  // Tous les grants directs — pour /admin/permissions
  @Get("permissions/grants")
  @RequirePermissions("user.manage_permissions")
  listAllGrants() {
    return this.service.listAllGrants();
  }

  @Get("users/:userId/permissions")
  @RequirePermissions("user.manage_permissions")
  list(@Param("userId") userId: string) {
    return this.service.list(userId);
  }

  @Put("users/:userId/permissions/:code")
  @RequirePermissions("user.manage_permissions")
  upsert(
    @Param("userId") userId: string,
    @Param("code") code: string,
    @Body() dto: UpsertUserPermissionDto,
    @CurrentUser() caller: AuthUser,
  ) {
    return this.service.upsert(userId, code, dto.type, caller.user_id);
  }

  @Delete("users/:userId/permissions/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("user.manage_permissions")
  remove(@Param("userId") userId: string, @Param("code") code: string) {
    return this.service.remove(userId, code);
  }
}
