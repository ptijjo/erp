-- CreateTable
CREATE TABLE "TaskSubtask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskSubtask_taskId_idx" ON "TaskSubtask"("taskId");

-- CreateIndex
CREATE INDEX "TaskSubtask_organizationId_idx" ON "TaskSubtask"("organizationId");

-- CreateIndex
CREATE INDEX "TaskSubtask_dueDate_idx" ON "TaskSubtask"("dueDate");

-- CreateIndex
CREATE INDEX "TaskSubtask_status_idx" ON "TaskSubtask"("status");

-- AddForeignKey
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS tenant isolation (aligné sur Task)
ALTER TABLE "TaskSubtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskSubtask" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_org_isolation ON "TaskSubtask";
CREATE POLICY tenant_org_isolation ON "TaskSubtask"
  FOR ALL
  USING (app_rls_can_access_org("organizationId"::text))
  WITH CHECK (app_rls_can_access_org("organizationId"::text));
