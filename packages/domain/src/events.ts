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

// ─── Assignment (Phase 2a) ────────────────────────────────
// Refs: SPEC.md §7 — assignation module/parcours

export interface AssignmentCreatedPayload {
  readonly assignment_id: string;
  readonly assignee_id: string;   // user_id de l'apprenant
  readonly assigner_id: string;   // user_id de celui qui assigne
  readonly resource_type: "module" | "path";
  readonly resource_id: string;
  readonly due_date: string | null;
}

export interface AssignmentDeletedPayload {
  readonly assignment_id: string;
  readonly assignee_id: string;
  readonly deleted_by: string;    // user_id
  readonly resource_type: "module" | "path";
  readonly resource_id: string;
}

export type AssignmentCreated = DomainEvent<AssignmentCreatedPayload>;
export type AssignmentDeleted = DomainEvent<AssignmentDeletedPayload>;

// ─── RBAC (transverse, Phase 1) ──────────────────────────
// Refs: SPEC.md §5 §8 — audit immuable des octrois/revocations de roles et permissions

export interface UserRoleGrantedPayload {
  readonly user_id: string;
  readonly role_id: string;
  readonly role_code: string;
  readonly granted_by: string; // user_id
}

export interface UserRoleRevokedPayload {
  readonly user_id: string;
  readonly role_id: string;
  readonly role_code: string;
  readonly revoked_by: string; // user_id
}

export interface RoleCreatedPayload {
  readonly role_id: string;
  readonly role_code: string;
  readonly created_by: string; // user_id, "system" pour seed
}

export interface RoleDeletedPayload {
  readonly role_id: string;
  readonly role_code: string;
  readonly deleted_by: string;
}

// ─── Onboarding (Phase 2) ────────────────────────────────────────────────────
// Refs: SPEC.md §8 US-1.1 — wizard première connexion apprenant

export interface OnboardingCompletedPayload {
  readonly user_id: string;
  readonly completed_at: string;
  readonly job_role: string;
}

export type OnboardingCompleted = DomainEvent<OnboardingCompletedPayload>;

// ─── Scheduler — rappels automatiques (Phase 2) ──────────────────────────────
// Refs: SPEC.md §9 US-2b.5 — cron notifications

export interface ScheduledReminderSentPayload {
  readonly learner_id: string;
  readonly reminder_type: "stamp_expiring" | "assignment_due" | "streak_broken";
  readonly resource_id?: string;
  readonly sent_at: string;
}

export type ScheduledReminderSent = DomainEvent<ScheduledReminderSentPayload>;

export interface RolePermissionsChangedPayload {
  readonly role_id: string;
  readonly role_code: string;
  readonly added: readonly string[];   // permission codes ajoutees
  readonly removed: readonly string[]; // permission codes retirees
  readonly changed_by: string;
}

export type UserRoleGranted = DomainEvent<UserRoleGrantedPayload>;
export type UserRoleRevoked = DomainEvent<UserRoleRevokedPayload>;
export type RoleCreated = DomainEvent<RoleCreatedPayload>;
export type RoleDeleted = DomainEvent<RoleDeletedPayload>;
export type RolePermissionsChanged = DomainEvent<RolePermissionsChangedPayload>;
