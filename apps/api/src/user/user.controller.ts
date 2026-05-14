import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";
import { GdprService } from "./gdpr.service.js";
import { AdminService, type CreateUserDto, type UpdateUserDto, type ListUsersQuery } from "./admin.service.js";
import { MfaService } from "../auth/mfa.service.js";
import { OnboardingService } from "./onboarding.service.js";

// Refs: SPEC.md §7, §11 US-1.1, US-1.4
// IMPORTANT: routes statiques déclarées AVANT les routes dynamiques (:id)
// pour éviter que NestJS matche "me", "admin/learners", etc. comme un :id

@Controller("users")
export class UserController {
  constructor(
    private readonly gdprService: GdprService,
    private readonly adminService: AdminService,
    private readonly mfaService: MfaService,
    private readonly onboardingService: OnboardingService,
  ) {}

  // ─── Routes statiques /me/* ───────────────────────────────────────────────

  @Get("me")
  async getMe(@CurrentUser() user: AuthUser) {
    return this.adminService.getUserById(user.user_id);
  }

  @Patch("me")
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: { display_name?: string; current_password?: string; new_password?: string },
  ) {
    return this.adminService.updateSelf(user.user_id, body);
  }

  @Post("me/mfa/setup")
  async mfaSetup(@CurrentUser() user: AuthUser) {
    return this.mfaService.setupMfa(user.user_id);
  }

  @Post("me/mfa/enable")
  @HttpCode(HttpStatus.OK)
  async mfaEnable(@CurrentUser() user: AuthUser, @Body("code") code: string) {
    return this.mfaService.enableMfa(user.user_id, code);
  }

  @Post("me/mfa/disable")
  @HttpCode(HttpStatus.OK)
  async mfaDisableSelf(@CurrentUser() user: AuthUser, @Body("code") code?: string) {
    return this.mfaService.disableMfa({
      targetUserId: user.user_id,
      callerId: user.user_id,
      callerCanDisableOthers: user.permissions.includes("user.disable_mfa_other"),
      code,
    });
  }

  @Get("me/onboarding")
  async checkOnboarding(@CurrentUser() user: AuthUser) {
    return this.onboardingService.checkOnboarding(user.user_id);
  }

  @Post("me/onboarding/complete")
  @HttpCode(HttpStatus.NO_CONTENT)
  async completeOnboarding(
    @CurrentUser() user: AuthUser,
    @Body("job_role") jobRole: string,
  ) {
    return this.onboardingService.completeOnboarding(user.user_id, jobRole);
  }

  @Get("me/export")
  async exportMyData(@CurrentUser() user: AuthUser) {
    return this.gdprService.exportLearnerData(user.user_id);
  }

  // ─── Routes statiques /admin/* ────────────────────────────────────────────

  @Get("admin/learners")
  @RequirePermissions("learner.read")
  async listLearners(@Query("team_id") teamId?: string) {
    return this.adminService.listLearners(teamId);
  }

  @Get("admin/learners/:id")
  @RequirePermissions("learner.read_detail")
  async getLearnerDetail(@Param("id") id: string) {
    return this.adminService.getLearnerDetail(id);
  }

  // ─── CRUD users — routes collection ───────────────────────────────────────

  @Get()
  @RequirePermissions("user.read")
  async listUsers(@Query() query: ListUsersQuery) {
    return this.adminService.listUsers(query);
  }

  @Post()
  @RequirePermissions("user.create")
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  // ─── CRUD users — routes dynamiques /:id — TOUJOURS EN DERNIER ────────────

  @Get(":id")
  @RequirePermissions("user.read")
  async getUser(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch(":id")
  @RequirePermissions("user.update")
  async updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch(":id/password")
  @RequirePermissions("user.reset_password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Param("id") id: string, @Body("password") password: string) {
    return this.adminService.resetPassword(id, password);
  }

  @Post(":id/mfa/disable")
  @RequirePermissions("user.disable_mfa_other")
  @HttpCode(HttpStatus.OK)
  async mfaDisableForUser(@Param("id") targetId: string, @CurrentUser() caller: AuthUser) {
    return this.mfaService.disableMfa({
      targetUserId: targetId,
      callerId: caller.user_id,
      callerCanDisableOthers: caller.permissions.includes("user.disable_mfa_other"),
    });
  }

  @Delete(":id")
  @RequirePermissions("user.delete")
  async deleteUser(@Param("id") id: string, @CurrentUser() caller: AuthUser) {
    return this.adminService.deleteUser(id, caller.user_id);
  }
}
