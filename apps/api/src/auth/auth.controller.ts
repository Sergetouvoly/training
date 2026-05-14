// Refs: SPEC.md §9 US-1.1 — POST /auth/login + POST /auth/refresh
import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { Public } from "./public.decorator.js";
import { CurrentUser } from "./current-user.decorator.js";
import type { AuthUser } from "./auth.types.js";
import { AuthService, type LoginDto } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Réémet un token avec les permissions à jour — appelé silencieusement par NextAuth
  @Post("refresh")
  @HttpCode(200)
  refresh(@CurrentUser() user: AuthUser) {
    return this.authService.refresh(user.user_id);
  }
}
