-- AlterTable
ALTER TABLE "TaskSubtask" ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "TaskSubtask_priority_idx" ON "TaskSubtask"("priority");
