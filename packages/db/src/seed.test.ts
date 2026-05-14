import { describe, expect, it } from "vitest";
import { PERMISSIONS, SYSTEM_ROLE_CODES } from "@elearning/domain";
import { ROLE_PERMISSIONS, SYSTEM_ROLES } from "./rbac-seed.js";

describe("RBAC seed matrix", () => {
  it("defines the five system roles", () => {
    expect(SYSTEM_ROLES.map((role) => role.code).sort()).toEqual(Object.values(SYSTEM_ROLE_CODES).sort());
  });

  it("uses only known permissions", () => {
    const known = new Set(PERMISSIONS);
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      expect(permissions.length, `${role} has permissions`).toBeGreaterThan(0);
      for (const permission of permissions) {
        expect(known.has(permission), `${role}:${permission}`).toBe(true);
      }
    }
  });

  it("matches the expected RBAC gates for each seeded role", () => {
    expect(ROLE_PERMISSIONS.super_admin).toEqual(PERMISSIONS);
    expect(ROLE_PERMISSIONS.admin).toContain("user.delete");
    expect(ROLE_PERMISSIONS.admin).not.toContain("user.disable_mfa_other");
    expect(ROLE_PERMISSIONS.trainer).toContain("module.create");
    expect(ROLE_PERMISSIONS.trainer).not.toContain("module.delete");
    expect(ROLE_PERMISSIONS.manager).toContain("analytics.team_read");
    expect(ROLE_PERMISSIONS.manager).not.toContain("user.read");
    expect(ROLE_PERMISSIONS.learner).toEqual(["module.read", "learning_path.read"]);
  });
});
