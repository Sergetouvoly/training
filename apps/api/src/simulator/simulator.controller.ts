import { Controller, Post, Get, Body, Param, Query, NotFoundException } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { SimulatorService, type StartSessionDto, type ChoiceDto } from "./simulator.service.js";
import { PassportService } from "./passport.service.js";
import { PassportExportService } from "./passport-export.service.js";
import { MasteryService } from "./mastery.service.js";
import { TeamAnalyticsService } from "./team-analytics.service.js";
import { VideoScenarioService, type CreateVideoNodeDto } from "./video-scenario.service.js";
import { DebriefService } from "./debrief.service.js";

// Refs: SPEC.md §9 US-2a.1–2a.6

@Controller("simulator")
export class SimulatorController {
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly passportService: PassportService,
    private readonly passportExportService: PassportExportService,
    private readonly masteryService: MasteryService,
    private readonly teamAnalyticsService: TeamAnalyticsService,
    private readonly videoScenarioService: VideoScenarioService,
    private readonly debriefService: DebriefService,
  ) {}

  // ─── Scénario (US-2a.1) ────────────────────────────────

  @Post("sessions")
  async startSession(@Body() dto: StartSessionDto) {
    return this.simulatorService.startSession(dto);
  }

  @Post("sessions/:sessionId/choose")
  async choose(
    @Param("sessionId") sessionId: string,
    @Body() dto: ChoiceDto,
  ) {
    return this.simulatorService.chooseNode(sessionId, dto);
  }

  // ─── Passport + Streak (US-2a.3) ───────────────────────

  @Get("passport")
  async getPassport(@CurrentUser() user: AuthUser) {
    const learnerId = await this.passportService.resolveLearnerId(user.user_id);
    if (!learnerId) throw new NotFoundException("Profil apprenant introuvable");
    await this.passportService.recordActivity(learnerId);
    return this.passportService.getPassport(learnerId);
  }

  @Get("passport/export")
  async exportPassport(@CurrentUser() user: AuthUser) {
    const learnerId = await this.passportService.resolveLearnerId(user.user_id);
    if (!learnerId) throw new NotFoundException("Profil apprenant introuvable");
    return this.passportExportService.exportPassport(learnerId);
  }

  // ─── Maîtrise (TBD-2a.1 résolu) ───────────────────────

  @Get("mastery/:competenceId")
  async getMastery(
    @CurrentUser() user: AuthUser,
    @Param("competenceId") competenceId: string,
  ) {
    const learnerId = await this.passportService.resolveLearnerId(user.user_id);
    if (!learnerId) throw new NotFoundException("Profil apprenant introuvable");
    return { mastery_score: await this.masteryService.computeMastery(learnerId, competenceId) };
  }

  @Post("mastery/:competenceId/check-expire")
  @RequirePermissions("mastery.check_expire")
  async checkExpire(
    @Param("competenceId") competenceId: string,
    @Body("learner_id") learnerId: string,
  ) {
    await this.masteryService.checkAndExpire(learnerId, competenceId);
    return { ok: true };
  }

  // ─── Team Analytics (US-2a.5) ──────────────────────────

  @Get("analytics/team")
  @RequirePermissions("analytics.team_read")
  async getTeamAnalytics(@Query("team_id") teamId: string) {
    return this.teamAnalyticsService.getTeamAggregates(teamId);
  }

  @Get("analytics/team/modules")
  @RequirePermissions("analytics.team_read")
  async getTeamModuleProgress(@Query("team_id") teamId: string) {
    return this.teamAnalyticsService.getTeamModuleProgress(teamId);
  }

  // ─── Vidéo interactive (US-2a.2) ───────────────────────

  @Post("scenarios/video-node")
  @RequirePermissions("scenario.create_video_node")
  async createVideoNode(@Body() dto: CreateVideoNodeDto) {
    return this.videoScenarioService.createVideoNode(dto);
  }

  // ─── Debrief (US-2a.6) ─────────────────────────────────

  @Get("debrief")
  async getDebrief(@CurrentUser() user: AuthUser) {
    const learnerId = await this.passportService.resolveLearnerId(user.user_id);
    if (!learnerId) throw new NotFoundException("Profil apprenant introuvable");
    return this.debriefService.generateDebrief(learnerId);
  }
}


