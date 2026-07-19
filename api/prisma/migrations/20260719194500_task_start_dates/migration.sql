-- AlterTable Task
ALTER TABLE "Task" ADD COLUMN "startDate" TIMESTAMP(3);

-- AlterTable TaskSubtask
ALTER TABLE "TaskSubtask" ADD COLUMN "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_startDate_idx" ON "Task"("startDate");

-- CreateIndex
CREATE INDEX "TaskSubtask_startDate_idx" ON "TaskSubtask"("startDate");
