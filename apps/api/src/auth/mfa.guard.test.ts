import { describe, it, expect } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MfaGuard } from "./mfa.guard.js";
import type { AuthUser } from "./auth.types.js";

// Refs: SPEC.md §11 US-1.1 — MFA verifie sur tout endpoint protege

function makeContext(user?: AuthUser) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function makeGuard(metadata?: Record<string, unknown>) {
  const reflector = new Reflector();
  reflector.getAllAndOverride = (key: string, _targets: any[]) =>
    metadata && key in metadata ? metadata[key] : undefined;
  return new MfaGuard(reflector);
}

const verifiedUser: AuthUser = {
  user_id: "u1",
  email: "test@holenek.fr",
  display_name: "Test",
  platform_role: "learner",
  mfa_verified: true,
};

const unverifiedUser: AuthUser = { ...verifiedUser, mfa_verified: false };

describe("MfaGuard", () => {
  it("permet request quand MFA est verifie (US-1.1)", () => {
    expect(makeGuard().canActivate(makeContext(verifiedUser))).toBe(true);
  });

  it("rejette request quand MFA n'est pas verifie", () => {
    expect(() => makeGuard().canActivate(makeContext(unverifiedUser)))
      .toThrow(ForbiddenException);
    expect(() => makeGuard().canActivate(makeContext(unverifiedUser)))
      .toThrow("MFA verification required");
  });

  it("rejette request non authentifiee", () => {
    expect(() => makeGuard().canActivate(makeContext()))
      .toThrow(ForbiddenException);
  });

  it("permet endpoint public sans MFA", () => {
    expect(makeGuard({ isPublic: true }).canActivate(makeContext())).toBe(true);
  });

  it("permet endpoint public meme avec MFA non verifie", () => {
    expect(makeGuard({ isPublic: true }).canActivate(makeContext(unverifiedUser))).toBe(true);
  });
});
