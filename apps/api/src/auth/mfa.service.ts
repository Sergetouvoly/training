// Refs: SPEC.md §11 US-1.1 — MFA TOTP setup / enable / disable (super_admin override)
import { Injectable, ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { PrismaService } from "../prisma/prisma.service.js";

export interface DisableMfaParams {
  readonly targetUserId: string;
  readonly callerId: string;
  readonly callerCanDisableOthers: boolean;
  readonly code?: string;
}

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (user.mfa_enabled) throw new ForbiddenException("MFA already enabled — disable it first");

    const secret = speakeasy.generateSecret({ name: `Holenek (${user.email})`, length: 20 });

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfa_secret: secret.base32 },
    });

    const qr_data_url = await QRCode.toDataURL(secret.otpauth_url!);

    return { otpauth_url: secret.otpauth_url!, qr_data_url };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (!user.mfa_secret) throw new ForbiddenException("Call setupMfa first");

    const valid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: "base32",
      token: code,
      window: 1,
    });
    if (!valid) throw new UnauthorizedException("Invalid TOTP code");

    return this.prisma.user.update({
      where: { id: userId },
      data: { mfa_enabled: true },
      select: { id: true, mfa_enabled: true },
    });
  }

  async disableMfa({ targetUserId, callerId, callerCanDisableOthers, code }: DisableMfaParams) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException(`User ${targetUserId} not found`);

    const isSelf = callerId === targetUserId;

    if (!isSelf && !callerCanDisableOthers) {
      throw new ForbiddenException("Missing permission to disable MFA for another user");
    }

    if (callerCanDisableOthers && !isSelf) {
      return this.prisma.user.update({
        where: { id: targetUserId },
        data: { mfa_enabled: false, mfa_secret: null },
        select: { id: true, mfa_enabled: true },
      });
    }

    // L'utilisateur désactive son propre MFA : code TOTP requis
    if (!user.mfa_secret) {
      return this.prisma.user.update({
        where: { id: targetUserId },
        data: { mfa_enabled: false },
        select: { id: true, mfa_enabled: true },
      });
    }

    const valid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: "base32",
      token: code ?? "",
      window: 1,
    });
    if (!valid) throw new UnauthorizedException("Invalid TOTP code");

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { mfa_enabled: false, mfa_secret: null },
      select: { id: true, mfa_enabled: true },
    });
  }
}
