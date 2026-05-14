import { Controller, Post, Get, Body, Param, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { LitfService, type SubmitAnswerDto } from "./litf.service.js";
import { BuddyService, type RequestBuddyDto } from "./buddy.service.js";
import { ChallengeService, type CreateChallengeDto } from "./challenge.service.js";
import { NotificationService } from "./notification.service.js";

// Refs: SPEC.md §9 US-2b.1–2b.5

@Controller("social")
export class SocialController {
  constructor(
    private readonly litfService: LitfService,
    private readonly buddyService: BuddyService,
    private readonly challengeService: ChallengeService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── LITF (US-2b.1, US-2b.2) ──────────────────────────
  @Post("litf/answer")
  async submitLitf(@Body() dto: SubmitAnswerDto) {
    return this.litfService.submitAnswer(dto);
  }

  // ─── Buddy (US-2b.3) ───────────────────────────────────
  @Post("buddy/request")
  async requestBuddy(@Body() dto: RequestBuddyDto) {
    return this.buddyService.requestBuddy(dto);
  }

  @Post("buddy/:relationId/accept")
  async acceptBuddy(
    @Param("relationId") relationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.buddyService.acceptBuddy(relationId, user.user_id);
  }

  @Get("buddy")
  async getBuddies(@CurrentUser() user: AuthUser) {
    return this.buddyService.getBuddies(user.user_id);
  }

  // ─── Challenge (US-2b.4) ───────────────────────────────
  @Post("challenges")
  @RequirePermissions("challenge.create")
  async createChallenge(@Body() dto: CreateChallengeDto) {
    return this.challengeService.createChallenge(dto);
  }

  @Post("challenges/:challengeId/close")
  @RequirePermissions("challenge.close")
  async closeChallenge(@Param("challengeId") challengeId: string) {
    return this.challengeService.closeChallenge(challengeId);
  }

  // ─── Notifications (US-2b.5) ──────────────────────────
  @Get("notifications")
  async listNotifications(
    @CurrentUser() user: AuthUser,
    @Query("unread_only") unreadOnly?: string,
  ) {
    return this.notificationService.list(user.user_id, {
      unread_only: unreadOnly === "true",
    });
  }

  @Post("notifications/mark-read")
  async markRead(@CurrentUser() user: AuthUser) {
    return this.notificationService.markRead(user.user_id);
  }
}


