import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Permission } from "@elearning/domain";
import { PermissionsGuard } from "./permissions.guard.js";
import type { AuthUser } from "./auth.types.js";

function makeGuard(required: Permission[] | undefined, isPublic = false) {
  const reflector = {
    getAllAndOverride: (key: string) => key === "isPublic" ? isPublic : required,
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

function makeContext(user?: AuthUser) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

function user(permissions: Permission[] = []): AuthUser {
  return {
    user_id: "u1",
    email: "test@holenek.fr",
    display_name: "Test",
    app_role: "learner",
    permissions,
    mfa_verified: true,
  };
}

describe("PermissionsGuard", () => {
  it("allows public routes without user", () => {
    expect(makeGuard(["user.read"], true).canActivate(makeContext())).toBe(true);
  });

  it("allows authenticated routes without required permissions", () => {
    expect(makeGuard(undefined).canActivate(makeContext(user()))).toBe(true);
  });

  it("allows when user has every required permission", () => {
    expect(makeGuard(["user.read", "user.update"]).canActivate(makeContext(user(["user.read", "user.update"])))).toBe(true);
  });

  it("denies when a required permission is missing", () => {
    expect(() => makeGuard(["user.delete"]).canActivate(makeContext(user(["user.read"])))).toThrow(ForbiddenException);
  });

  it("denies anonymous protected requests", () => {
    expect(() => makeGuard(["user.read"]).canActivate(makeContext())).toThrow(ForbiddenException);
  });
});
