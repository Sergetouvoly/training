import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { Roles } from "../auth/roles.decorator.js";
import { LearningService, type CreateLearningPathDto, type CreateModuleDto, type UpdateModuleContentDto, type UpdateLearningPathDto } from "./learning.service.js";
import { ProgressionService, type SaveProgressDto } from "./progression.service.js";
import type { AuthUser } from "../auth/auth.types.js";

// Refs: SPEC.md §11 US-1.2, US-1.5

@Controller("learning")
export class LearningController {
  constructor(
    private readonly learningService: LearningService,
    private readonly progressionService: ProgressionService,
  ) {}

  // ─── LearningPath ──────────────────────────────────────

  @Post("paths")
  @Roles("admin", "super_admin")
  async createPath(@Body() dto: CreateLearningPathDto) {
    return this.learningService.createPath(dto);
  }

  @Get("paths")
  async listPaths() {
    return this.learningService.listPaths();
  }

  @Get("paths/:id")
  async findPath(@Param("id") id: string) {
    return this.learningService.findPathById(id);
  }

  @Patch("paths/:id")
  @Roles("admin", "super_admin")
  async updatePath(@Param("id") id: string, @Body() dto: UpdateLearningPathDto) {
    return this.learningService.updatePath(id, dto);
  }

  @Delete("paths/:id")
  @Roles("admin", "super_admin")
  async deletePath(@Param("id") id: string) {
    return this.learningService.deletePath(id);
  }

  // ─── Module ────────────────────────────────────────────

  @Post("modules")
  @Roles("admin", "trainer", "super_admin")
  async createModule(@Body() dto: CreateModuleDto) {
    return this.learningService.createModule(dto);
  }

  @Get("modules")
  async listModules() {
    return this.learningService.listModules();
  }

  @Get("modules/:id")
  async findModule(@Param("id") id: string) {
    return this.learningService.findModuleById(id);
  }

  @Delete("modules/:id")
  @Roles("admin", "super_admin")
  async deleteModule(@Param("id") id: string) {
    return this.learningService.deleteModule(id);
  }

  // Refs: SPEC-CONTENT.md §7.5 — draft → published + version_hash + ModulePublished
  @Post("modules/:id/publish")
  @Roles("admin", "trainer", "super_admin")
  @HttpCode(HttpStatus.OK)
  async publishModule(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.learningService.publishModule(id, user.user_id);
  }

  @Patch("modules/:id/content")
  @Roles("admin", "trainer", "super_admin")
  async updateModuleContent(
    @Param("id") id: string,
    @Body() dto: UpdateModuleContentDto,
  ) {
    return this.learningService.updateModuleContent(id, dto);
  }

  // ─── Progression ───────────────────────────────────────

  @Post("progress")
  async saveProgress(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveProgressDto,
  ) {
    return this.progressionService.saveProgress(user.user_id, dto);
  }

  @Get("progress/:learnerId")
  async getProgress(@Param("learnerId") learnerId: string) {
    return this.progressionService.getProgressSummary(learnerId);
  }
}
