-- CreateTable
CREATE TABLE "TaskGenerationRun" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "clientId" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "created" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "wouldCreate" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL,
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TaskGenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskGenerationRun_startedAt_idx" ON "TaskGenerationRun"("startedAt");

-- CreateIndex
CREATE INDEX "TaskGenerationRun_clientId_idx" ON "TaskGenerationRun"("clientId");

-- CreateIndex
CREATE INDEX "TaskGenerationRun_status_idx" ON "TaskGenerationRun"("status");
