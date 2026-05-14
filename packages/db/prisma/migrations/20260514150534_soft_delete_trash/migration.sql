-- AlterTable
ALTER TABLE "competences" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "evaluation_items" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "learning_paths" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "competences_deleted_at_idx" ON "competences"("deleted_at");

-- CreateIndex
CREATE INDEX "evaluation_items_deleted_at_idx" ON "evaluation_items"("deleted_at");

-- CreateIndex
CREATE INDEX "learning_paths_deleted_at_idx" ON "learning_paths"("deleted_at");

-- CreateIndex
CREATE INDEX "modules_deleted_at_idx" ON "modules"("deleted_at");
