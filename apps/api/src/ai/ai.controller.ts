// Refs: SPEC.md §9 US-3.1–US-3.4, R-3.1, R-3.2, R-3.3
import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { Roles } from "../auth/roles.decorator.js";
import type { AuthUser } from "../auth/auth.types.js";
import { AiNestService, type QueryAiDto, type IndexDocumentDto } from "./ai.service.js";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiNestService) {}

  // US-3.1–US-3.4 — predefined action RAG query (R-3.1: no free prompt)
  @Post("query")
  @HttpCode(HttpStatus.OK)
  async query(
    @CurrentUser() user: AuthUser,
    @Body() dto: QueryAiDto,
  ) {
    return this.aiService.query({
      ...dto,
      learner_id: dto.learner_id ?? user.user_id,
    });
  }

  // Admin — index document chunk for RAG
  @Post("documents/index")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  async indexDocument(@Body() dto: IndexDocumentDto) {
    await this.aiService.indexDocument(dto);
  }

  // Learner — get daily token usage
  @Get("tokens/:learnerId")
  getTokensUsed(@Param("learnerId") learnerId: string) {
    return { tokens_used_today: this.aiService.getTokensUsed(learnerId) };
  }
}
