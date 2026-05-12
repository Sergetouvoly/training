-- Migration initiale — mono-organisation Holenek
-- Refs: SPEC.md §6 — suppression multi-tenant, isolation par platform_role
-- Generated: 2026-05-08

CREATE TYPE "PlatformRole" AS ENUM ('super_admin', 'admin', 'trainer', 'manager', 'learner');

-- User : identite + authentification + role plateforme
CREATE TABLE "users" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email"         TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name"  TEXT NOT NULL,
    "platform_role" "PlatformRole" NOT NULL,
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "mfa_secret"    TEXT,
    "mfa_enabled"   BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_platform_role_idx" ON "users"("platform_role");

-- Learner : profil metier 1-to-1 avec User
CREATE TABLE "learners" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"    TEXT NOT NULL,
    "job_role"   TEXT NOT NULL,
    "team_id"    TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "learners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "learners_user_id_key" ON "learners"("user_id");
CREATE INDEX "learners_job_role_idx" ON "learners"("job_role");
CREATE INDEX "learners_team_id_idx" ON "learners"("team_id");
ALTER TABLE "learners" ADD CONSTRAINT "learners_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Competence
CREATE TABLE "competences" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "code"       TEXT NOT NULL,
    "label_fr"   TEXT NOT NULL,
    "label_en"   TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "competences_code_key" ON "competences"("code");

-- Stamp
CREATE TABLE "stamps" (
    "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "learner_id"          TEXT NOT NULL,
    "competence_id"       TEXT NOT NULL,
    "state"               TEXT NOT NULL,
    "validated_at"        TIMESTAMP(3) NOT NULL,
    "expires_at"          TIMESTAMP(3) NOT NULL,
    "module_version_hash" TEXT NOT NULL,
    "performance_score"   DOUBLE PRECISION NOT NULL,
    "mastery_score"       DOUBLE PRECISION,
    "attempts"            INTEGER NOT NULL DEFAULT 1,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stamps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stamps_learner_id_idx" ON "stamps"("learner_id");
CREATE INDEX "stamps_competence_id_idx" ON "stamps"("competence_id");
CREATE INDEX "stamps_state_idx" ON "stamps"("state");
ALTER TABLE "stamps" ADD CONSTRAINT "stamps_learner_id_fkey"
    FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stamps" ADD CONSTRAINT "stamps_competence_id_fkey"
    FOREIGN KEY ("competence_id") REFERENCES "competences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Module
CREATE TABLE "modules" (
    "id"                         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "version"                    TEXT NOT NULL,
    "version_hash"               TEXT NOT NULL,
    "title_fr"                   TEXT NOT NULL,
    "status"                     TEXT NOT NULL DEFAULT 'draft',
    "competence_ids"             TEXT[],
    "content_fr"                 JSONB,
    "estimated_duration_minutes" INTEGER,
    "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                 TIMESTAMP(3) NOT NULL,
    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "modules_status_idx" ON "modules"("status");

-- LearningPath
CREATE TABLE "learning_paths" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "title_fr"        TEXT NOT NULL,
    "target_role"     TEXT NOT NULL,
    "module_sequence" TEXT[],
    "is_mandatory"    BOOLEAN NOT NULL DEFAULT false,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "learning_paths_target_role_idx" ON "learning_paths"("target_role");

-- EvaluationItem
CREATE TABLE "evaluation_items" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "bank_id"      TEXT NOT NULL,
    "format"       TEXT NOT NULL,
    "difficulty"   INTEGER NOT NULL,
    "bloom_level"  INTEGER NOT NULL,
    "concept_tags" TEXT[],
    "content"      JSONB,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluation_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "evaluation_items_bank_id_idx" ON "evaluation_items"("bank_id");
CREATE INDEX "evaluation_items_format_idx" ON "evaluation_items"("format");
CREATE INDEX "evaluation_items_difficulty_idx" ON "evaluation_items"("difficulty");

-- Scenario
CREATE TABLE "scenarios" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "title_fr"       TEXT NOT NULL,
    "description_fr" TEXT,
    "root_node_id"   TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- ScenarioNode
CREATE TABLE "scenario_nodes" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "scenario_id" TEXT NOT NULL,
    "content_fr"  TEXT NOT NULL,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "choices"     JSONB NOT NULL DEFAULT '[]',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scenario_nodes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scenario_nodes_scenario_id_idx" ON "scenario_nodes"("scenario_id");
ALTER TABLE "scenario_nodes" ADD CONSTRAINT "scenario_nodes_scenario_id_fkey"
    FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ScenarioSession
CREATE TABLE "scenario_sessions" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "scenario_id"     TEXT NOT NULL,
    "learner_id"      TEXT NOT NULL,
    "current_node_id" TEXT,
    "path_taken"      JSONB NOT NULL DEFAULT '[]',
    "completed"       BOOLEAN NOT NULL DEFAULT false,
    "score"           DOUBLE PRECISION,
    "started_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at"    TIMESTAMP(3),
    CONSTRAINT "scenario_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scenario_sessions_learner_id_idx" ON "scenario_sessions"("learner_id");
CREATE INDEX "scenario_sessions_scenario_id_idx" ON "scenario_sessions"("scenario_id");
ALTER TABLE "scenario_sessions" ADD CONSTRAINT "scenario_sessions_scenario_id_fkey"
    FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scenario_sessions" ADD CONSTRAINT "scenario_sessions_learner_id_fkey"
    FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Streak
CREATE TABLE "streaks" (
    "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "learner_id"         TEXT NOT NULL,
    "current_days"       INTEGER NOT NULL DEFAULT 0,
    "longest_days"       INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" TIMESTAMP(3),
    "updated_at"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "streaks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "streaks_learner_id_key" ON "streaks"("learner_id");
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_learner_id_fkey"
    FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BuddyRelation
CREATE TABLE "buddy_relations" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "learner_id"  TEXT NOT NULL,
    "buddy_id"    TEXT NOT NULL,
    "accepted"    BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "buddy_relations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "buddy_relations_learner_id_buddy_id_key" ON "buddy_relations"("learner_id", "buddy_id");
CREATE INDEX "buddy_relations_learner_id_idx" ON "buddy_relations"("learner_id");

-- TeamChallenge
CREATE TABLE "team_challenges" (
    "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "title_fr"      TEXT NOT NULL,
    "team_ids"      TEXT[],
    "competence_id" TEXT NOT NULL,
    "starts_at"     TIMESTAMP(3) NOT NULL,
    "ends_at"       TIMESTAMP(3) NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'active',
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_challenges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "team_challenges_status_idx" ON "team_challenges"("status");

-- Notification
CREATE TABLE "notifications" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "learner_id" TEXT NOT NULL,
    "type"       TEXT NOT NULL,
    "payload"    JSONB NOT NULL,
    "read"       BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_learner_id_idx" ON "notifications"("learner_id");
CREATE INDEX "notifications_learner_id_read_idx" ON "notifications"("learner_id", "read");

-- DocumentEmbedding (RAG Phase 3)
CREATE TABLE "document_embeddings" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "document_id" TEXT NOT NULL,
    "page"        INTEGER NOT NULL DEFAULT 1,
    "chunk_text"  TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "document_embeddings_document_id_idx" ON "document_embeddings"("document_id");

-- DomainEvent (append-only, jamais mute ni supprime)
CREATE TABLE "domain_events" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "event_name"     TEXT NOT NULL,
    "event_version"  TEXT NOT NULL,
    "occurred_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produced_by"    TEXT NOT NULL,
    "correlation_id" TEXT,
    "payload"        JSONB NOT NULL,
    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "domain_events_event_name_idx" ON "domain_events"("event_name");
CREATE INDEX "domain_events_occurred_at_idx" ON "domain_events"("occurred_at");

-- Trigger NOTIFY sur domain_events pour PG LISTEN (Phase 1 EDA)
CREATE OR REPLACE FUNCTION notify_domain_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('domain_events', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$;
CREATE TRIGGER domain_events_notify
  AFTER INSERT ON "domain_events"
  FOR EACH ROW EXECUTE FUNCTION notify_domain_event();

-- AppConfig : configuration globale application
CREATE TABLE "app_config" (
    "key"        TEXT NOT NULL,
    "value"      JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);
