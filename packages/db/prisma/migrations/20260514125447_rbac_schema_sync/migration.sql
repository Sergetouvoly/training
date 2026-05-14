-- AlterTable
ALTER TABLE "buddy_relations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "competences" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_embeddings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "domain_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "evaluation_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "learners" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "learning_paths" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "modules" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "scenario_nodes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "scenario_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "scenarios" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stamps" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "streaks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "team_challenges" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
