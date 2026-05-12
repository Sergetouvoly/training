import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { Roles } from "../auth/roles.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";
import { GdprService } from "./gdpr.service.js";
import { AdminService, type CreateUserDto, type UpdateUserDto, type ListUsersQuery } from "./admin.service.js";
import { MfaService } from "../auth/mfa.service.js";

// Refs: SPEC.md §7, §11 US-1.1, US-1.4

@Controller("users")
export class UserController {
  constructor(
    private readonly gdprService: GdprService,
    private readonly adminService: AdminService,
    private readonly mfaService: MfaService,
  ) {}

  // ─── Profil courant ────────────────────────────────────

  @Get("me")
  async getMe(@CurrentUser() user: AuthUser) {
    return this.adminService.getUserById(user.user_id);
  }

  // ─── MFA TOTP (US-1.1) ────────────────────────────────

  // Étape 1 : génère secret + QR code (l'app TOTP n'est pas encore activée)
  @Post("me/mfa/setup")
  async mfaSetup(@CurrentUser() user: AuthUser) {
    return this.mfaService.setupMfa(user.user_id);
  }

  // Étape 2 : confirme avec un code valide → active MFA
  @Post("me/mfa/enable")
  @HttpCode(HttpStatus.OK)
  async mfaEnable(@CurrentUser() user: AuthUser, @Body("code") code: string) {
    return this.mfaService.enableMfa(user.user_id, code);
  }

  // Désactive son propre MFA (code requis) ou n'importe quel user par super_admin (sans code)
  @Post("me/mfa/disable")
  @HttpCode(HttpStatus.OK)
  async mfaDisableSelf(@CurrentUser() user: AuthUser, @Body("code") code?: string) {
    return this.mfaService.disableMfa({
      targetUserId: user.user_id,
      callerId: user.user_id,
      callerRole: user.platform_role,
      code,
    });
  }

  // super_admin seulement : désactive le MFA d'un autre utilisateur
  @Post(":id/mfa/disable")
  @Roles("super_admin")
  @HttpCode(HttpStatus.OK)
  async mfaDisableForUser(@Param("id") targetId: string, @CurrentUser() caller: AuthUser) {
    return this.mfaService.disableMfa({
      targetUserId: targetId,
      callerId: caller.user_id,
      callerRole: caller.platform_role,
    });
  }

  // ─── RGPD ──────────────────────────────────────────────

  @Get("me/export")
  async exportMyData(@CurrentUser() user: AuthUser) {
    return this.gdprService.exportLearnerData(user.user_id);
  }

  // ─── CRUD users (super_admin + admin) ──────────────────

  @Get()
  @Roles("super_admin", "admin")
  async listUsers(@Query() query: ListUsersQuery) {
    return this.adminService.listUsers(query);
  }

  @Get(":id")
  @Roles("super_admin", "admin")
  async getUser(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Post()
  @Roles("super_admin", "admin")
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch(":id")
  @Roles("super_admin", "admin")
  async updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch(":id/password")
  @Roles("super_admin", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Param("id") id: string, @Body("password") password: string) {
    return this.adminService.resetPassword(id, password);
  }

  @Delete(":id")
  @Roles("super_admin", "admin")
  async deleteUser(@Param("id") id: string, @CurrentUser() caller: AuthUser) {
    return this.adminService.deleteUser(id, caller.user_id);
  }

  // ─── Learners (admin view) ─────────────────────────────

  @Get("admin/learners")
  @Roles("super_admin", "admin", "trainer", "manager")
  async listLearners() {
    return this.adminService.listLearners();
  }

  @Get("admin/learners/:id")
  @Roles("super_admin", "admin", "trainer", "manager")
  async getLearnerDetail(@Param("id") id: string) {
    return this.adminService.getLearnerDetail(id);
  }
}
