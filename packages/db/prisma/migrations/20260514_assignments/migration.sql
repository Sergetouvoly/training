-- Refs: SPEC.md §7 — assignation module/parcours par admin/trainer/manager
-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "assignee_id" TEXT NOT NULL,
    "assigner_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignments_assignee_id_resource_type_resource_id_key" ON "assignments"("assignee_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "assignments_assignee_id_idx" ON "assignments"("assignee_id");

-- CreateIndex
CREATE INDEX "assignments_assigner_id_idx" ON "assignments"("assigner_id");

-- CreateIndex
CREATE INDEX "assignments_resource_type_resource_id_idx" ON "assignments"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "assignments_deleted_at_idx" ON "assignments"("deleted_at");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigner_id_fkey" FOREIGN KEY ("assigner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
