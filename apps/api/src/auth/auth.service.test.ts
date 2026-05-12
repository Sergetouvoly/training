import { describe, it, expect, beforeEach, vi } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";

// Refs: SPEC.md §11 US-1.1 — login email/password, JWT contient le bon platform_role

const PASSWORD = "Test1234!";
const HASH = bcrypt.hashSync(PASSWORD, 10);

function makeUser(platform_role: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `u-${platform_role}`,
    email: `${platform_role}@holenek.fr`,
    display_name: platform_role,
    password_hash: HASH,
    platform_role,
    is_active: true,
    mfa_enabled: false,
    mfa_secret: null,
    last_login_at: null,
    ...overrides,
  };
}

function makePrismaStub(user: ReturnType<typeof makeUser> | null) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
    },
  } as any;
}

function makeJwtStub() {
  const signed: any[] = [];
  return {
    sign: vi.fn().mockImplementation((payload: any) => {
      signed.push(payload);
      return "mock-token";
    }),
    _signed: signed,
  } as any as JwtService & { _signed: any[] };
}

describe("AuthService — login", () => {
  let jwt: ReturnType<typeof makeJwtStub>;

  beforeEach(() => {
    jwt = makeJwtStub();
  });

  for (const role of ["super_admin", "admin", "trainer", "manager", "learner"] as const) {
    it(`login ${role} — JWT payload contient platform_role=${role}`, async () => {
      const user = makeUser(role);
      const service = new AuthService(makePrismaStub(user), jwt);

      const result = await service.login({ email: user.email, password: PASSWORD });

      expect(result.platform_role).toBe(role);
      expect(result.access_token).toBe("mock-token");

      const jwtPayload = jwt._signed[0];
      expect(jwtPayload.platform_role).toBe(role);
      expect(jwtPayload.user_id).toBe(user.id);
      expect(jwtPayload.email).toBe(user.email);
      expect(jwtPayload.mfa_verified).toBe(true); // MFA non activé → mfa_verified=true (pas d'obstacle)
    });
  }

  it("rejects inactive user", async () => {
    const user = makeUser("learner", { is_active: false });
    const service = new AuthService(makePrismaStub(user), jwt);

    await expect(service.login({ email: user.email, password: PASSWORD }))
      .rejects.toThrow(UnauthorizedException);
  });

  it("rejects wrong password", async () => {
    const user = makeUser("learner");
    const service = new AuthService(makePrismaStub(user), jwt);

    await expect(service.login({ email: user.email, password: "wrong" }))
      .rejects.toThrow(UnauthorizedException);
  });

  it("rejects unknown user", async () => {
    const service = new AuthService(makePrismaStub(null), jwt);

    await expect(service.login({ email: "ghost@holenek.fr", password: PASSWORD }))
      .rejects.toThrow(UnauthorizedException);
  });

  it("rejects MFA-enabled user without mfa_code", async () => {
    const user = makeUser("admin", { mfa_enabled: true });
    const service = new AuthService(makePrismaStub(user), jwt);

    await expect(service.login({ email: user.email, password: PASSWORD }))
      .rejects.toThrow(UnauthorizedException);
  });

  it("accepts MFA-enabled user with valid TOTP code, mfa_verified=true in JWT", async () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    const token = speakeasy.totp({ secret: secret.base32, encoding: "base32" });
    const user = makeUser("admin", { mfa_enabled: true, mfa_secret: secret.base32 });
    const service = new AuthService(makePrismaStub(user), jwt);

    const result = await service.login({ email: user.email, password: PASSWORD, mfa_code: token });

    expect(result.access_token).toBe("mock-token");
    expect(jwt._signed[0].mfa_verified).toBe(true);
  });

  it("rejects MFA-enabled user with wrong TOTP code", async () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    const user = makeUser("admin", { mfa_enabled: true, mfa_secret: secret.base32 });
    const service = new AuthService(makePrismaStub(user), jwt);

    await expect(service.login({ email: user.email, password: PASSWORD, mfa_code: "000000" }))
      .rejects.toThrow(UnauthorizedException);
  });
});
