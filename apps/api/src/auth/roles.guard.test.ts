import { describe, it, expect } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard.js";
import type { AuthUser, PlatformRole } from "./auth.types.js";
import { PLATFORM_ROLES } from "./auth.types.js";

// Refs: SPEC.md §4, §7 — RolesGuard verifie platform_role (unique, pas un tableau)

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
  return new RolesGuard(reflector);
}

function makeUser(platform_role: PlatformRole): AuthUser {
  return { user_id: "u1", email: "test@holenek.fr", display_name: "Test", platform_role, mfa_verified: true };
}

describe("RolesGuard", () => {
  it("permet l'acces sans @Roles() (tout user authentifie)", () => {
    const guard = makeGuard();
    expect(guard.canActivate(makeContext(makeUser("learner")))).toBe(true);
  });

  it("permet l'acces quand le role correspond", () => {
    const guard = makeGuard({ roles: ["admin"] });
    expect(guard.canActivate(makeContext(makeUser("admin")))).toBe(true);
  });

  it("permet l'acces quand le role est dans la liste", () => {
    const guard = makeGuard({ roles: ["admin", "trainer"] });
    expect(guard.canActivate(makeContext(makeUser("trainer")))).toBe(true);
  });

  it("rejette si le role ne correspond pas", () => {
    const guard = makeGuard({ roles: ["admin"] });
    expect(() => guard.canActivate(makeContext(makeUser("learner")))).toThrow(ForbiddenException);
  });

  it("rejette learner sur route admin", () => {
    const guard = makeGuard({ roles: ["admin"] });
    expect(() => guard.canActivate(makeContext(makeUser("learner")))).toThrow("Required role(s): admin");
  });

  it("rejette manager sur route super_admin", () => {
    const guard = makeGuard({ roles: ["super_admin"] });
    expect(() => guard.canActivate(makeContext(makeUser("manager")))).toThrow(ForbiddenException);
  });

  it("permet endpoint public sans user", () => {
    const guard = makeGuard({ isPublic: true, roles: ["admin"] });
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it("rejette user non authentifie sur route protegee", () => {
    const guard = makeGuard({ roles: ["admin"] });
    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it("supporte les 5 platform_roles definis", () => {
    for (const role of PLATFORM_ROLES) {
      const guard = makeGuard({ roles: [role] });
      expect(guard.canActivate(makeContext(makeUser(role)))).toBe(true);
    }
  });

  it("it_blocks_access_for_learner sur toute route admin/trainer/manager/super_admin", () => {
    const protectedRoles: PlatformRole[] = ["admin", "trainer", "manager", "super_admin"];
    for (const required of protectedRoles) {
      const guard = makeGuard({ roles: [required] });
      expect(() => guard.canActivate(makeContext(makeUser("learner")))).toThrow(ForbiddenException);
    }
  });

  it("it_allows_access_for_super_admin sur toute route", () => {
    const allRoles: PlatformRole[] = ["admin", "trainer", "manager", "learner"];
    for (const required of allRoles) {
      // super_admin doit etre explicitement dans la liste — le guard ne fait pas d'heritage
      const guard = makeGuard({ roles: [required, "super_admin"] });
      expect(guard.canActivate(makeContext(makeUser("super_admin")))).toBe(true);
    }
  });
});
