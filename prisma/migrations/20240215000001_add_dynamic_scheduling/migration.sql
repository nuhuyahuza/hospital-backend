-- Add reminder-related fields to PlanItem table
ALTER TABLE "PlanItem" ADD COLUMN "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "PlanItem" ADD COLUMN "nextReminderAt" TIMESTAMP(3);
ALTER TABLE "PlanItem" ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlanItem" ADD COLUMN "expectedCheckIns" INTEGER NOT NULL DEFAULT 0;

-- Create index for reminder processing
CREATE INDEX "PlanItem_nextReminderAt_idx" ON "PlanItem"("nextReminderAt") WHERE "deleted" = false AND "completed" = false; 