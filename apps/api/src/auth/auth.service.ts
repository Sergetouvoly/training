// Refs: SPEC.md §11 US-1.1 — login email/password + MFA TOTP, JWT signe
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { isPermission, type Permission } from "@elearning/domain";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AppRole, SessionPayload } from "./auth.types.js";

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
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        user_permissions: {
          include: { permission: true },
        },
      },
    });

    // Compte désactivé — on peut le révéler (pas d'énumération : même email requis)
    if (user && !user.is_active) {
      throw new UnauthorizedException({ code: "account_disabled", message: "Account disabled" });
    }

    // Email inconnu ou mot de passe incorrect — même message pour éviter l'énumération
    if (!user) {
      throw new UnauthorizedException({ code: "invalid_credentials", message: "Invalid credentials" });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException({ code: "invalid_credentials", message: "Invalid credentials" });
    }

    // MFA : si activée, valider le code TOTP avec speakeasy
    let mfa_verified = !user.mfa_enabled;
    if (user.mfa_enabled) {
      if (!dto.mfa_code || !/^\d{6}$/.test(dto.mfa_code)) {
        throw new UnauthorizedException({ code: "mfa_required", message: "MFA code required" });
      }
      const valid = speakeasy.totp.verify({
        secret: user.mfa_secret!,
        encoding: "base32",
        token: dto.mfa_code,
        window: 1,
      });
      if (!valid) throw new UnauthorizedException({ code: "mfa_invalid", message: "Invalid MFA code" });
      mfa_verified = true;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const permissions = collectPermissions(user.roles, user.user_permissions);

    const payload: Omit<SessionPayload, "iat" | "exp"> = {
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      app_role: user.app_role as AppRole,
      permissions,
      mfa_verified,
    };

    const ttlConfig = await this.prisma.appConfig.findUnique({ where: { key: "jwt_ttl_minutes" } });
    const ttlMinutes = typeof ttlConfig?.value === "number" ? ttlConfig.value : 15;
    const access_token = this.jwt.sign(payload, { expiresIn: `${ttlMinutes}m` });

    return {
      access_token,
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      app_role: user.app_role,
      permissions,
    };
  }

  // Réémet un token avec les permissions à jour depuis la DB (sans re-vérifier le mot de passe)
  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        user_permissions: { include: { permission: true } },
      },
    });
    if (!user?.is_active) throw new UnauthorizedException("User inactive");

    const permissions = collectPermissions(user.roles, user.user_permissions);
    const payload: Omit<SessionPayload, "iat" | "exp"> = {
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      app_role: user.app_role as AppRole,
      permissions,
      mfa_verified: true,
    };
    const ttlConfig = await this.prisma.appConfig.findUnique({ where: { key: "jwt_ttl_minutes" } });
    const ttlMinutes = typeof ttlConfig?.value === "number" ? ttlConfig.value : 480;
    const access_token = this.jwt.sign(payload, { expiresIn: `${ttlMinutes}m` });
    return { access_token, permissions };
  }
}

function collectPermissions(
  userRoles: ReadonlyArray<any>,
  userPermissions: ReadonlyArray<any> = [],
): Permission[] {
  // Base : permissions héritées des rôles
  const codes = new Set<Permission>();
  for (const userRole of userRoles) {
    for (const rp of userRole.role?.permissions ?? []) {
      const code = rp.permission?.code;
      if (typeof code === "string" && isPermission(code)) codes.add(code);
    }
  }
  // Grants directs : ajoutés même si le rôle ne les a pas
  for (const up of userPermissions) {
    if (up.type === "grant" && typeof up.permission?.code === "string" && isPermission(up.permission.code)) {
      codes.add(up.permission.code);
    }
  }
  // Denies directs : retirés même si le rôle les a (priorité maximale)
  for (const up of userPermissions) {
    if (up.type === "deny" && typeof up.permission?.code === "string" && isPermission(up.permission.code)) {
      codes.delete(up.permission.code);
    }
  }
  return [...codes].sort((a, b) => a.localeCompare(b));
}
