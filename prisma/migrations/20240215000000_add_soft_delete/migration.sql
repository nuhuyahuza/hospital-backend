-- Add deleted field to Note table
ALTER TABLE "Note" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;

-- Add deleted field to ChecklistItem table
ALTER TABLE "ChecklistItem" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;

-- Add deleted field to PlanItem table
ALTER TABLE "PlanItem" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for better performance on soft delete queries
CREATE INDEX "Note_deleted_idx" ON "Note"("deleted");
CREATE INDEX "ChecklistItem_deleted_idx" ON "ChecklistItem"("deleted");
CREATE INDEX "PlanItem_deleted_idx" ON "PlanItem"("deleted"); 