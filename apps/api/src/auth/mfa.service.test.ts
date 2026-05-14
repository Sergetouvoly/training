// Refs: SPEC.md §11 US-1.1 — MFA TOTP setup, enable, disable par super_admin
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { MfaService } from "./mfa.service.js";

const SECRET = "JBSWY3DPEHPK3PXP";

function makePrismaStub(user: Record<string, unknown> | null) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ ...user, ...data }),
      ),
    },
  } as any;
}

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "u-admin",
    email: "admin@holenek.fr",
    app_role: "admin",
    mfa_enabled: false,
    mfa_secret: null,
    ...overrides,
  };
}

describe("MfaService", () => {
  // ── setupMfa ──────────────────────────────────────────────────────────────

  it("setupMfa — génère un secret et une otpauth_url pour l'utilisateur", async () => {
    const user = makeUser();
    const prisma = makePrismaStub(user);
    const svc = new MfaService(prisma);

    const result = await svc.setupMfa(user.id);

    expect(result).toHaveProperty("otpauth_url");
    expect(result).toHaveProperty("qr_data_url");
    expect(result.otpauth_url).toContain("holenek");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: user.id } }),
    );
  });

  it("setupMfa — lève NotFoundException si user inconnu", async () => {
    const svc = new MfaService(makePrismaStub(null));
    await expect(svc.setupMfa("unknown")).rejects.toThrow(NotFoundException);
  });

  it("setupMfa — lève ForbiddenException si MFA déjà activé", async () => {
    const svc = new MfaService(makePrismaStub(makeUser({ mfa_enabled: true, mfa_secret: SECRET })));
    await expect(svc.setupMfa("u-admin")).rejects.toThrow(ForbiddenException);
  });

  // ── enableMfa ─────────────────────────────────────────────────────────────

  it("enableMfa — active MFA quand le code TOTP est valide", async () => {
    const speakeasy = await import("speakeasy");
    const token = speakeasy.totp({ secret: SECRET, encoding: "base32" });

    const user = makeUser({ mfa_secret: SECRET });
    const prisma = makePrismaStub(user);
    const svc = new MfaService(prisma);

    const result = await svc.enableMfa(user.id, token);

    expect(result.mfa_enabled).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mfa_enabled: true } }),
    );
  });

  it("enableMfa — lève UnauthorizedException si code invalide", async () => {
    const user = makeUser({ mfa_secret: SECRET });
    const svc = new MfaService(makePrismaStub(user));
    await expect(svc.enableMfa(user.id, "000000")).rejects.toThrow(UnauthorizedException);
  });

  it("enableMfa — lève ForbiddenException si setup pas fait (pas de secret)", async () => {
    const svc = new MfaService(makePrismaStub(makeUser()));
    await expect(svc.enableMfa("u-admin", "123456")).rejects.toThrow(ForbiddenException);
  });

  // ── disableMfa (self) ─────────────────────────────────────────────────────

  it("disableMfa — l'utilisateur peut désactiver son propre MFA avec son code TOTP valide", async () => {
    const speakeasy = await import("speakeasy");
    const token = speakeasy.totp({ secret: SECRET, encoding: "base32" });

    const user = makeUser({ mfa_enabled: true, mfa_secret: SECRET });
    const prisma = makePrismaStub(user);
    const svc = new MfaService(prisma);

    const result = await svc.disableMfa({ targetUserId: user.id, callerId: user.id, callerCanDisableOthers: false, code: token });

    expect(result.mfa_enabled).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mfa_enabled: false, mfa_secret: null } }),
    );
  });

  it("disableMfa — lève UnauthorizedException si l'utilisateur fournit un code invalide", async () => {
    const user = makeUser({ mfa_enabled: true, mfa_secret: SECRET });
    const svc = new MfaService(makePrismaStub(user));
    await expect(svc.disableMfa({ targetUserId: user.id, callerId: user.id, callerCanDisableOthers: false, code: "000000" }))
      .rejects.toThrow(UnauthorizedException);
  });

  // ── disableMfa (super_admin) ──────────────────────────────────────────────

  it("disableMfa — super_admin peut désactiver le MFA d'un autre user sans code", async () => {
    const target = makeUser({ id: "u-target", mfa_enabled: true, mfa_secret: SECRET });
    const prisma = makePrismaStub(target);
    const svc = new MfaService(prisma);

    const result = await svc.disableMfa({ targetUserId: target.id, callerId: "u-super", callerCanDisableOthers: true });

    expect(result.mfa_enabled).toBe(false);
  });

  it("disableMfa — non-super_admin ne peut pas désactiver le MFA d'un autre user", async () => {
    const target = makeUser({ id: "u-target", mfa_enabled: true, mfa_secret: SECRET });
    const svc = new MfaService(makePrismaStub(target));
    await expect(svc.disableMfa({ targetUserId: target.id, callerId: "u-other", callerCanDisableOthers: false }))
      .rejects.toThrow(ForbiddenException);
  });

  it("disableMfa — lève NotFoundException si user cible inconnu", async () => {
    const svc = new MfaService(makePrismaStub(null));
    await expect(svc.disableMfa({ targetUserId: "ghost", callerId: "u-super", callerCanDisableOthers: true }))
      .rejects.toThrow(NotFoundException);
  });
});

