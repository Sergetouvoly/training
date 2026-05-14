import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus,
} from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";
import { RoleService } from "./role.service.js";
import type { Permission } from "@elearning/domain";

@Controller("roles")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions("role.read")
  listAll() {
    return this.roleService.listAll();
  }

  @Get(":id")
  @RequirePermissions("role.read")
  getOne(@Param("id") id: string) {
    return this.roleService.getRoleWithPermissions(id);
  }

  @Post()
  @RequirePermissions("role.create")
  create(
    @Body() dto: { code: string; label_fr: string; label_en: string },
    @CurrentUser() caller: AuthUser,
  ) {
    return this.roleService.createRole({ ...dto, created_by: caller.user_id });
  }

  @Delete(":id")
  @RequirePermissions("role.delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string, @CurrentUser() caller: AuthUser) {
    await this.roleService.deleteRole(id, caller.user_id);
  }

  @Put(":id/permissions")
  @RequirePermissions("role.update_permissions")
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPermissions(
    @Param("id") id: string,
    @Body("permissions") permissions: Permission[],
    @CurrentUser() caller: AuthUser,
  ) {
    await this.roleService.setRolePermissions(id, permissions, caller.user_id);
  }
}

@Controller("permissions")
export class PermissionController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions("role.read")
  listAll() {
    return this.roleService.listPermissions();
  }
}

@Controller("users/:userId/roles")
export class UserRoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions("role.read")
  getUserRoles(@Param("userId") userId: string) {
    return this.roleService.getUserRoles(userId);
  }

  @Post(":roleId")
  @RequirePermissions("role.assign")
  @HttpCode(HttpStatus.NO_CONTENT)
  async grantRole(
    @Param("userId") userId: string,
    @Param("roleId") roleId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    await this.roleService.grantRole(userId, roleId, caller.user_id);
  }

  @Delete(":roleId")
  @RequirePermissions("role.assign")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeRole(
    @Param("userId") userId: string,
    @Param("roleId") roleId: string,
    @CurrentUser() caller: AuthUser,
  ) {
    await this.roleService.revokeRole(userId, roleId, caller.user_id);
  }
}
