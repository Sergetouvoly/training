/**
 * Canonical entity types — Refs: SPEC.md §6
 * Mono-organisation Holenek. Pas de tenant_id. Isolation par platform_role.
 */

export type PlatformRole = "super_admin" | "admin" | "trainer" | "manager" | "learner";
export type JobRole = "hr" | "developer" | "manager" | "finance";
export type StampState = "green" | "orange" | "red";
export type ModuleStatus = "draft" | "published";
export type TargetRole = "hr" | "developer" | "manager" | "finance" | "all";
export type AlertZone = "green" | "amber" | "red";

// Identite + authentification + role plateforme
export interface User {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly platform_role: PlatformRole;
  readonly is_active: boolean;
  readonly mfa_enabled: boolean;
  readonly last_login_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

// Profil metier (1-to-1 avec User, cree pour les roles learner/trainer/manager)
export interface Learner {
  readonly id: string;
  readonly user_id: string;
  readonly job_role: JobRole;
  readonly team_id: string | null; // label organisationnel libre, ex: "pole-rh"
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Competence {
  readonly id: string;
  readonly code: string; // unique global
  readonly label_fr: string;
  readonly label_en: string;
  readonly created_at: string;
}

export interface Stamp {
  readonly id: string;
  readonly learner_id: string;
  readonly competence_id: string;
  readonly state: StampState;
  readonly validated_at: string;
  readonly expires_at: string;
  readonly module_version_hash: string;
  readonly performance_score: number;
  readonly mastery_score: number | null;
  readonly attempts: number;
  readonly created_at: string;
}

export type EvaluationItemFormat =
  | "qcm_single"
  | "qcm_multi"
  | "true_false"
  | "open"
  | "video_branched";

export interface ItemChoice {
  readonly label: string;
  readonly is_correct: boolean;
}

export interface ItemContent {
  readonly question_fr: string;
  readonly question_en?: string;
  readonly choices?: readonly ItemChoice[];
  readonly correct_answer?: string;
}

export interface EvaluationItem {
  readonly id: string;
  readonly bank_id: string;
  readonly format: EvaluationItemFormat;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly bloom_level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly concept_tags: readonly string[];
  readonly content: ItemContent;
  readonly created_at: string;
}

export interface Module {
  readonly id: string;
  readonly version: string;
  readonly version_hash: string; // SHA-256(JSON.stringify(content_fr)), recalcule a la publication
  readonly title_fr: string;
  readonly status: ModuleStatus;
  readonly competence_ids: readonly string[];
  readonly estimated_duration_minutes: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface LearningPath {
  readonly id: string;
  readonly title_fr: string;
  readonly target_role: TargetRole;
  readonly module_sequence: readonly string[];
  readonly is_mandatory: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ComplianceTwin {
  readonly team_id: string;
  readonly coverage_ratio: number;
  readonly freshness_ratio: number;
  readonly mastery_avg: number;
  readonly exposure_level: 1 | 2 | 3 | 4 | 5;
  readonly composite_score: number;
  readonly alert_zone: AlertZone;
}

// Configuration globale application (remplace les champs de Tenant)
export interface AppConfig {
  readonly key: string; // unique, ex: "stamp_validity_months", "llm_provider", "mastery_window"
  readonly value: unknown; // JSON
  readonly updated_at: string;
}
