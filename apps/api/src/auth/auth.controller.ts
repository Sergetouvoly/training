// Refs: SPEC.md §9 US-1.1 — POST /auth/login
import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { Public } from "./public.decorator.js";
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
}
