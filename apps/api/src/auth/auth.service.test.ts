import { describe, it, expect, beforeEach, vi } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";

// Refs: SPEC.md §11 US-1.1 — login email/password, JWT contient le bon app_role

const PASSWORD = "Test1234!";
const HASH = bcrypt.hashSync(PASSWORD, 10);

function makeUser(app_role: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `u-${app_role}`,
    email: `${app_role}@holenek.fr`,
    display_name: app_role,
    password_hash: HASH,
    app_role,
    roles: [{ role: { permissions: [{ permission: { code: "module.read" } }, { permission: { code: "learning_path.read" } }] } }],
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
    appConfig: {
      findUnique: vi.fn().mockResolvedValue({ key: "jwt_ttl_minutes", value: 15 }),
    },
  } as any;
}

function makeJwtStub() {
  const signed: { payload: any; options: any }[] = [];
  return {
    sign: vi.fn().mockImplementation((payload: any, options: any) => {
      signed.push({ payload, options });
      return "mock-token";
    }),
    _signed: signed,
  } as any as JwtService & { _signed: { payload: any; options: any }[] };
}

describe("AuthService — login", () => {
  let jwt: ReturnType<typeof makeJwtStub>;

  beforeEach(() => {
    jwt = makeJwtStub();
  });

  for (const role of ["super_admin", "admin", "trainer", "manager", "learner"] as const) {
    it(`login ${role} — JWT payload contient app_role=${role}`, async () => {
      const user = makeUser(role);
      const service = new AuthService(makePrismaStub(user), jwt);

      const result = await service.login({ email: user.email, password: PASSWORD });

      expect(result.app_role).toBe(role);
      expect(result.permissions).toEqual(["learning_path.read", "module.read"]);
      expect(result.access_token).toBe("mock-token");

      const { payload: jwtPayload, options: jwtOptions } = jwt._signed[0];
      expect(jwtPayload.app_role).toBe(role);
      expect(jwtPayload.permissions).toEqual(["learning_path.read", "module.read"]);
      expect(jwtPayload.user_id).toBe(user.id);
      expect(jwtPayload.email).toBe(user.email);
      expect(jwtPayload.mfa_verified).toBe(true); // MFA non activé → mfa_verified=true (pas d'obstacle)
      expect(jwtOptions.expiresIn).toBe("15m"); // jwt_ttl_minutes=15 depuis AppConfig
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
    expect(jwt._signed[0].payload.mfa_verified).toBe(true);
  });

  it("rejects MFA-enabled user with wrong TOTP code", async () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    const user = makeUser("admin", { mfa_enabled: true, mfa_secret: secret.base32 });
    const service = new AuthService(makePrismaStub(user), jwt);

    await expect(service.login({ email: user.email, password: PASSWORD, mfa_code: "000000" }))
      .rejects.toThrow(UnauthorizedException);
  });
});

