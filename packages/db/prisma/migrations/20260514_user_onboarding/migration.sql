-- Refs: SPEC.md §8 US-1.1 — onboarding première connexion (F6)
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);
