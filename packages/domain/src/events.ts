/**
 * DomainEvent<T> — immutable, append-only, PascalCase past-tense.
 * Refs: SPEC.md §8
 * Mono-organisation : pas de tenant_id dans les events.
 */
export interface DomainEvent<T> {
  readonly event_id: string;
  readonly event_name: string;
  readonly event_version: string;
  readonly occurred_at: string;
  readonly produced_by: string;
  readonly correlation_id?: string;
  readonly payload: T;
}

// ─── Phase 1 ─────────────────────────────────────────────

export interface ProgressUpdatedPayload {
  readonly learner_id: string;
  readonly module_id: string;
  readonly module_version_hash: string;
  readonly progress_percent: number;
}

export interface CompetenceValidatedPayload {
  readonly learner_id: string;
  readonly competence_id: string;
  readonly stamp_id: string;
  readonly performance_score: number;
  readonly module_version_hash: string;
}

export interface ModulePublishedPayload {
  readonly module_id: string;
  readonly version: string;
  readonly version_hash: string;
  readonly published_by: string; // user_id
}

export type ProgressUpdated = DomainEvent<ProgressUpdatedPayload>;
export type CompetenceValidated = DomainEvent<CompetenceValidatedPayload>;
export type ModulePublished = DomainEvent<ModulePublishedPayload>;

// ─── Phase 2a ────────────────────────────────────────────

export interface CrisisScenarioCompletedPayload {
  readonly learner_id: string;
  readonly scenario_id: string;
  readonly session_id: string;
  readonly score: number;
  readonly path_length: number;
}

export interface CompetenceExpiredPayload {
  readonly learner_id: string;
  readonly competence_id: string;
  readonly stamp_id: string;
  readonly expired_at: string;
}

export interface StreakReachedPayload {
  readonly learner_id: string;
  readonly days: number;
}

export type CrisisScenarioCompleted = DomainEvent<CrisisScenarioCompletedPayload>;
export type CompetenceExpired = DomainEvent<CompetenceExpiredPayload>;
export type StreakReached = DomainEvent<StreakReachedPayload>;

// ─── Phase 2b ────────────────────────────────────────────

export interface LITFAnswerSubmittedPayload {
  readonly learner_id: string;
  readonly item_id: string;
  readonly source: "chrome_extension" | "slack" | "teams" | "web";
  readonly is_correct: boolean;
  readonly answered_at: string;
}

export interface BuddyRoleAcceptedPayload {
  readonly learner_id: string;
  readonly buddy_id: string;
  readonly relation_id: string;
}

export interface TeamChallengeCompletedPayload {
  readonly challenge_id: string;
  readonly winner_team_id: string;
  readonly participating_team_ids: string[];
  readonly final_scores: Record<string, number>; // team_id → score
}

export type LITFAnswerSubmitted = DomainEvent<LITFAnswerSubmittedPayload>;
export type BuddyRoleAccepted = DomainEvent<BuddyRoleAcceptedPayload>;
export type TeamChallengeCompleted = DomainEvent<TeamChallengeCompletedPayload>;

// ─── Phase 3 ─────────────────────────────────────────────

export interface RemediationModuleGeneratedPayload {
  readonly learner_id: string;
  readonly competence_id: string;
  readonly module_id: string;
  readonly source_document_ids: string[];
}

export interface RemediationModuleReusedPayload {
  readonly learner_id: string;
  readonly competence_id: string;
  readonly module_id: string;
}

export interface AICitationFailedPayload {
  readonly learner_id: string;
  readonly query_id: string;
  readonly reason: string;
}

export type RemediationModuleGenerated = DomainEvent<RemediationModuleGeneratedPayload>;
export type RemediationModuleReused = DomainEvent<RemediationModuleReusedPayload>;
export type AICitationFailed = DomainEvent<AICitationFailedPayload>;

// ─── Phase 4 ─────────────────────────────────────────────

export interface RegulatoryUpdateDetectedPayload {
  readonly source: string;
  readonly summary_fr: string;
  readonly detected_at: string;
}

export interface AuditBundleExportedPayload {
  readonly learner_id: string;
  readonly bundle_hash: string;
  readonly exported_by: string; // user_id
  readonly exported_at: string;
}

export interface ComplianceTwinSnapshottedPayload {
  readonly team_id: string;
  readonly snapshot_at: string;
  readonly alert_zone: "green" | "amber" | "red";
  readonly composite_score: number;
}

export type RegulatoryUpdateDetected = DomainEvent<RegulatoryUpdateDetectedPayload>;
export type AuditBundleExported = DomainEvent<AuditBundleExportedPayload>;
export type ComplianceTwinSnapshotted = DomainEvent<ComplianceTwinSnapshottedPayload>;
