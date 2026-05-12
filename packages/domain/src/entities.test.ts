import { describe, it, expect } from "vitest";
import type {
  Learner,
  Competence,
  Stamp,
  StampState,
  EvaluationItem,
  EvaluationItemFormat,
  Module,
  LearningPath,
  TargetRole,
  ComplianceTwin,
  AlertZone,
  AppConfig,
} from "./entities.js";

// Refs: SPEC.md §6 — canonical entity types (mono-organisation Holenek)

describe("Learner", () => {
  it("has user_id and job_role (platform_role isolation)", () => {
    const learner: Learner = {
      id: "l-1",
      user_id: "u-1",
      job_role: "developer",
      team_id: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(learner.user_id).toBe("u-1");
    expect(learner.job_role).toBe("developer");
  });

  it("supports all job roles", () => {
    const roles: Learner["job_role"][] = ["hr", "developer", "manager", "finance"];
    expect(roles).toHaveLength(4);
  });
});

describe("Stamp", () => {
  // Refs: SPEC.md §7 R-1.1 — Green/Orange/Red states
  it("has valid stamp states matching R-1.1", () => {
    const validStates: StampState[] = ["green", "orange", "red"];
    expect(validStates).toEqual(["green", "orange", "red"]);
  });

  it("creates a valid stamp with all required fields", () => {
    const stamp: Stamp = {
      id: "s-1",
      learner_id: "l-1",
      competence_id: "c-1",
      state: "green",
      validated_at: "2026-01-15T10:00:00Z",
      expires_at: "2027-01-15T10:00:00Z",
      module_version_hash: "sha256-abc123",
      performance_score: 85,
      mastery_score: null,
      attempts: 1,
      created_at: "2026-01-15T10:00:00Z",
    };
    expect(stamp.state).toBe("green");
    expect(stamp.mastery_score).toBeNull();
    expect(stamp.learner_id).toBe("l-1");
  });

  it("performance_score is a number (R-2a.1 distinct from mastery)", () => {
    const stamp: Stamp = {
      id: "s-2",
      learner_id: "l-1",
      competence_id: "c-1",
      state: "orange",
      validated_at: "2025-06-01T00:00:00Z",
      expires_at: "2026-06-01T00:00:00Z",
      module_version_hash: "sha256-def456",
      performance_score: 72,
      mastery_score: 65,
      attempts: 2,
      created_at: "2025-06-01T00:00:00Z",
    };
    expect(stamp.performance_score).not.toBe(stamp.mastery_score);
  });
});

describe("EvaluationItem", () => {
  it("supports all defined formats", () => {
    const formats: EvaluationItemFormat[] = [
      "qcm_single",
      "qcm_multi",
      "true_false",
      "open",
      "video_branched",
    ];
    expect(formats).toHaveLength(5);
  });

  it("difficulty is 1-5, bloom_level is 1-6", () => {
    const item: EvaluationItem = {
      id: "ei-1",
      bank_id: "bank-1",
      format: "qcm_single",
      difficulty: 3,
      bloom_level: 4,
      concept_tags: ["security", "gdpr"],
      content: { question_fr: "Qu'est-ce que le RGPD ?", choices: [{ label: "A", is_correct: true }, { label: "B", is_correct: false }] },
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(item.difficulty).toBeGreaterThanOrEqual(1);
    expect(item.difficulty).toBeLessThanOrEqual(5);
    expect(item.bloom_level).toBeGreaterThanOrEqual(1);
    expect(item.bloom_level).toBeLessThanOrEqual(6);
  });
});

describe("Module", () => {
  it("has version_hash for certification traceability (R-1.5)", () => {
    const mod: Module = {
      id: "m-1",
      version: "1.0.0",
      version_hash: "sha256-mod-abc",
      title_fr: "Sécurité des données",
      status: "published",
      competence_ids: ["c-1", "c-2"],
      estimated_duration_minutes: 30,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(mod.version_hash).toBeTruthy();
    expect(mod.competence_ids).toHaveLength(2);
  });
});

describe("LearningPath", () => {
  it("supports all target roles including 'all'", () => {
    const roles: TargetRole[] = ["hr", "developer", "manager", "finance", "all"];
    expect(roles).toHaveLength(5);
  });

  it("has ordered module_sequence", () => {
    const path: LearningPath = {
      id: "lp-1",
      title_fr: "Parcours conformité RGPD",
      target_role: "all",
      module_sequence: ["m-1", "m-2", "m-3"],
      is_mandatory: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(path.module_sequence[0]).toBe("m-1");
    expect(path.is_mandatory).toBe(true);
  });
});

describe("ComplianceTwin", () => {
  it("has valid alert zones", () => {
    const zones: AlertZone[] = ["green", "amber", "red"];
    expect(zones).toEqual(["green", "amber", "red"]);
  });

  it("is scoped by team_id (R-4.5 — pas de données individuelles identifiables)", () => {
    const twin: ComplianceTwin = {
      team_id: "team-1",
      coverage_ratio: 0.85,
      freshness_ratio: 0.92,
      mastery_avg: 0.78,
      exposure_level: 3,
      composite_score: 0.84,
      alert_zone: "green",
    };
    expect(twin.team_id).toBe("team-1");
    expect(twin.exposure_level).toBeGreaterThanOrEqual(1);
    expect(twin.exposure_level).toBeLessThanOrEqual(5);
  });
});

describe("AppConfig", () => {
  it("has key/value structure (remplace configuration Tenant)", () => {
    const config: AppConfig = {
      key: "mastery_window",
      value: 3,
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(config.key).toBe("mastery_window");
    expect(config.value).toBe(3);
  });
});

describe("Competence", () => {
  it("has unique code", () => {
    const comp: Competence = {
      id: "c-1",
      code: "RGPD-001",
      label_fr: "Gestion des données",
      label_en: "Data management",
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(comp.code).toBe("RGPD-001");
  });
});
