// Refs: SPEC.md §11 US-1.1 — login email/password + MFA TOTP, JWT signe
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service.js";
import type { PlatformRole, SessionPayload } from "./auth.types.js";

export interface LoginDto {
  email: string;
  password: string;
  mfa_code?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user?.is_active) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // MFA : si active, le code TOTP est obligatoire (speakeasy a brancher Phase 1)
    if (user.mfa_enabled) {
      if (!dto.mfa_code || !/^\d{6}$/.test(dto.mfa_code)) {
        throw new UnauthorizedException("MFA code required");
      }
    }

    // mfa_verified = true si MFA non activée (pas d'obstacle) ou si le code TOTP vient d'être validé
    const mfa_verified = !user.mfa_enabled;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const payload: Omit<SessionPayload, "iat" | "exp"> = {
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      platform_role: user.platform_role as PlatformRole,
      mfa_verified,
    };

    const access_token = this.jwt.sign(payload);

    return {
      access_token,
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      platform_role: user.platform_role,
    };
  }
}
