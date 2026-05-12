// Refs: docs/BACKLOG.md §2b — fige la matrice rôles × actions.
// Si un test casse ici, c'est qu'on a élargi/restreint une permission :
// vérifier la cohérence avec le @Roles(...) côté API avant de mettre à jour.
import { describe, it, expect } from "vitest";
import {
  can, canAccessAdmin, canAccessTrainerSpace, canAccessManagerSpace,
  type Action,
} from "../lib/permissions";

const ROLES = ["super_admin", "admin", "trainer", "manager", "learner"] as const;

describe("permissions.can()", () => {
  it("fail-closed : rôle absent/inconnu refuse tout", () => {
    expect(can(undefined, "user.read")).toBe(false);
    expect(can("", "module.read")).toBe(false);
    expect(can("nope" as any, "config.write")).toBe(false);
  });

  it("super_admin a TOUTES les permissions", () => {
    const allActions: Action[] = [
      "user.read", "user.create", "user.update", "user.delete",
      "user.reset_password", "user.disable_mfa",
      "learner.read", "learner.read_detail",
      "module.read", "module.create", "module.update", "module.delete", "module.publish",
      "path.read", "path.create", "path.update", "path.delete",
      "competence.read", "competence.write",
      "assessment.read", "assessment.write",
      "config.read", "config.write",
      "audit.read",
    ];
    for (const a of allActions) {
      expect(can("super_admin", a), `super_admin doit pouvoir ${a}`).toBe(true);
    }
  });

  it("learner ne peut que lire les ressources publiques", () => {
    expect(can("learner", "module.read")).toBe(true);
    expect(can("learner", "path.read")).toBe(true);
    expect(can("learner", "user.read")).toBe(false);
    expect(can("learner", "module.update")).toBe(false);
    expect(can("learner", "config.read")).toBe(false);
  });

  it("trainer édite contenu mais pas users/paths/config", () => {
    expect(can("trainer", "module.create")).toBe(true);
    expect(can("trainer", "module.update")).toBe(true);
    expect(can("trainer", "module.publish")).toBe(true);
    expect(can("trainer", "module.delete")).toBe(false); // admin seul
    expect(can("trainer", "assessment.write")).toBe(true);
    expect(can("trainer", "path.update")).toBe(false);
    expect(can("trainer", "user.update")).toBe(false);
    expect(can("trainer", "competence.write")).toBe(false);
    expect(can("trainer", "config.write")).toBe(false);
  });

  it("manager lit son équipe mais n'édite rien", () => {
    expect(can("manager", "learner.read")).toBe(true);
    expect(can("manager", "learner.read_detail")).toBe(true);
    expect(can("manager", "module.update")).toBe(false);
    expect(can("manager", "user.create")).toBe(false);
    expect(can("manager", "path.update")).toBe(false);
  });

  it("seul super_admin peut désactiver le MFA d'autrui et écrire la config", () => {
    expect(can("super_admin", "user.disable_mfa")).toBe(true);
    expect(can("admin", "user.disable_mfa")).toBe(false);
    expect(can("super_admin", "config.write")).toBe(true);
    expect(can("admin", "config.write")).toBe(false);
  });
});

describe("permissions.canAccessXxx() helpers", () => {
  it("canAccessAdmin : super_admin, admin, trainer (assessment), manager (learner)", () => {
    expect(canAccessAdmin("super_admin")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("trainer")).toBe(true);
    expect(canAccessAdmin("manager")).toBe(true);
    expect(canAccessAdmin("learner")).toBe(false);
  });

  it("canAccessTrainerSpace : super_admin, admin, trainer", () => {
    expect(canAccessTrainerSpace("super_admin")).toBe(true);
    expect(canAccessTrainerSpace("admin")).toBe(true);
    expect(canAccessTrainerSpace("trainer")).toBe(true);
    expect(canAccessTrainerSpace("manager")).toBe(false);
    expect(canAccessTrainerSpace("learner")).toBe(false);
  });

  it("canAccessManagerSpace : super_admin, admin, manager", () => {
    expect(canAccessManagerSpace("super_admin")).toBe(true);
    expect(canAccessManagerSpace("admin")).toBe(true);
    expect(canAccessManagerSpace("manager")).toBe(true);
    expect(canAccessManagerSpace("trainer")).toBe(false);
    expect(canAccessManagerSpace("learner")).toBe(false);
  });
});

describe("Snapshot complet de la matrice", () => {
  // Si ce snapshot saute, c'est intentionnel ou c'est un drift à investiguer.
  it("matche le snapshot connu", () => {
    const matrix: Record<string, Record<string, boolean>> = {};
    const allActions: Action[] = [
      "user.read", "user.create", "user.update", "user.delete",
      "user.reset_password", "user.disable_mfa",
      "learner.read", "learner.read_detail",
      "module.read", "module.create", "module.update", "module.delete", "module.publish",
      "path.read", "path.create", "path.update", "path.delete",
      "competence.read", "competence.write",
      "assessment.read", "assessment.write",
      "config.read", "config.write",
      "audit.read",
    ];
    for (const role of ROLES) {
      matrix[role] = {};
      for (const a of allActions) matrix[role][a] = can(role, a);
    }
    expect(matrix).toMatchSnapshot();
  });
});
