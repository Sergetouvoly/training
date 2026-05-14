import { describe, expect, it } from "vitest";
import { can, canAny, canAccessAdmin, canAccessTrainerSpace, canAccessManagerSpace } from "../lib/permissions";

const PERMS_SUPER_ADMIN = [
  "user.read", "user.create", "user.update", "user.delete", "user.reset_password", "user.disable_mfa_other",
  "learner.read", "learner.read_detail",
  "competence.read", "competence.create", "competence.update", "competence.delete",
  "module.read", "module.create", "module.update", "module.delete", "module.publish", "module.upload_media",
  "learning_path.read", "learning_path.create", "learning_path.update", "learning_path.delete",
  "evaluation_item.read", "evaluation_item.create", "evaluation_item.update", "evaluation_item.delete", "evaluation_item.import_csv",
  "stamp.read_any", "mastery.check_expire", "scenario.create_video_node",
  "challenge.create", "challenge.close", "analytics.team_read",
  "app_config.read", "app_config.write", "ai.index_document", "audit.read",
  "role.read", "role.create", "role.update", "role.delete", "role.assign", "role.update_permissions",
];

const PERMS_ADMIN = PERMS_SUPER_ADMIN.filter(
  (p) => !["user.disable_mfa_other", "app_config.write", "role.create", "role.delete", "role.update_permissions"].includes(p),
);

const PERMS_TRAINER = [
  "module.read", "module.create", "module.update", "module.publish", "module.upload_media",
  "evaluation_item.read", "evaluation_item.create", "evaluation_item.update", "evaluation_item.delete", "evaluation_item.import_csv",
  "learner.read", "learner.read_detail", "competence.read", "learning_path.read",
];

const PERMS_MANAGER = [
  "learner.read", "learner.read_detail", "analytics.team_read",
  "challenge.create", "challenge.close", "scenario.create_video_node",
  "module.read", "learning_path.read", "competence.read",
];

const PERMS_LEARNER = ["module.read", "learning_path.read"];

describe("can()", () => {
  it("fail-closed sur permissions vides/absentes", () => {
    expect(can(undefined, "user.read")).toBe(false);
    expect(can([], "user.read")).toBe(false);
  });

  it("retourne true quand permission presente", () => {
    expect(can(PERMS_ADMIN, "user.read")).toBe(true);
  });

  it("retourne false quand permission absente", () => {
    expect(can(PERMS_TRAINER, "user.delete")).toBe(false);
  });
});

describe("canAny()", () => {
  it("retourne true si au moins une permission est presente", () => {
    expect(canAny(PERMS_MANAGER, ["user.read", "analytics.team_read"])).toBe(true);
  });

  it("fail-closed sans correspondance", () => {
    expect(canAny(PERMS_LEARNER, ["user.read", "app_config.read"])).toBe(false);
  });
});

describe("canAccessAdmin/Trainer/Manager", () => {
  it("admin spaces accessibles aux 4 roles non-learner", () => {
    expect(canAccessAdmin(PERMS_SUPER_ADMIN)).toBe(true);
    expect(canAccessAdmin(PERMS_ADMIN)).toBe(true);
    expect(canAccessAdmin(PERMS_TRAINER)).toBe(true);
    expect(canAccessAdmin(PERMS_MANAGER)).toBe(true);
    expect(canAccessAdmin(PERMS_LEARNER)).toBe(false);
  });

  it("trainer space : super_admin, admin, trainer", () => {
    expect(canAccessTrainerSpace(PERMS_SUPER_ADMIN)).toBe(true);
    expect(canAccessTrainerSpace(PERMS_ADMIN)).toBe(true);
    expect(canAccessTrainerSpace(PERMS_TRAINER)).toBe(true);
    expect(canAccessTrainerSpace(PERMS_MANAGER)).toBe(false);
    expect(canAccessTrainerSpace(PERMS_LEARNER)).toBe(false);
  });

  it("manager space : super_admin, admin, manager", () => {
    expect(canAccessManagerSpace(PERMS_SUPER_ADMIN)).toBe(true);
    expect(canAccessManagerSpace(PERMS_ADMIN)).toBe(true);
    expect(canAccessManagerSpace(PERMS_MANAGER)).toBe(true);
    expect(canAccessManagerSpace(PERMS_TRAINER)).toBe(false);
    expect(canAccessManagerSpace(PERMS_LEARNER)).toBe(false);
  });
});
