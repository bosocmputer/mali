-- Update 2 round 1: 8-status workflow, payment types, payment evidence, status history.

-- 1) Task statuses. SUBMITTED is renamed (not dropped) so the existing finished tasks keep their
--    meaning: every company starts as "ลูกค้าชำระเอง", where filing = done.
ALTER TYPE "TaskStatus" RENAME VALUE 'SUBMITTED' TO 'DONE';
ALTER TYPE "TaskStatus" ADD VALUE 'WAITING_DOCS' BEFORE 'PROCESSING';
ALTER TYPE "TaskStatus" ADD VALUE 'FILED' AFTER 'PROCESSING';
ALTER TYPE "TaskStatus" ADD VALUE 'AWAITING_CLIENT_PAYMENT' AFTER 'FILED';
ALTER TYPE "TaskStatus" ADD VALUE 'AWAITING_OFFICE_PAYMENT' AFTER 'AWAITING_CLIENT_PAYMENT';
ALTER TYPE "TaskStatus" ADD VALUE 'NOT_FILING' AFTER 'DONE';

-- 2) Payment types.
CREATE TYPE "PaymentType" AS ENUM ('CLIENT_PAYS', 'OFFICE_PAYS', 'NO_ADDITIONAL', 'NO_TAX');

-- 3) Rule: does this kind of task involve paying anything? (decided with the customer: set when
--    the rule is created). Seed the existing non-payment forms.
ALTER TABLE "Rule" ADD COLUMN "hasPayment" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Rule" SET "hasPayment" = false
WHERE "taxForm" IN ('ส.บช.3', 'บอจ.5', 'AGM', 'ประชุมผู้ถือหุ้น', 'จัดทำงบ (ร่าง)');

-- 4) Company tax type: default payment type for new tasks.
ALTER TABLE "TaxType" ADD COLUMN "defaultPaymentType" "PaymentType" NOT NULL DEFAULT 'CLIENT_PAYS';

-- 5) Task: workflow data.
ALTER TABLE "Task"
  ADD COLUMN "paymentType"     "PaymentType" NOT NULL DEFAULT 'CLIENT_PAYS',
  ADD COLUMN "docsRequestedAt" DATE,
  ADD COLUMN "docsReceivedAt"  DATE,
  ADD COLUMN "filedAt"         DATE,
  ADD COLUMN "taxAmount"       DECIMAL(14,2),
  ADD COLUMN "clientPaidAt"    DATE,
  ADD COLUMN "clientSlipUrls"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "officePaidAt"    DATE,
  ADD COLUMN "receiptUrls"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "notFilingReason" TEXT,
  ADD COLUMN "completedAt"     TIMESTAMP(3);

-- Finished tasks: best known completion time is their last update.
UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE';

-- 6) Status history (who, when, from, to, reason).
CREATE TABLE "TaskStatusHistory" (
  "id"          TEXT NOT NULL,
  "taskId"      TEXT NOT NULL,
  "fromStatus"  "TaskStatus",
  "toStatus"    "TaskStatus" NOT NULL,
  "changedById" TEXT NOT NULL,
  "changedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason"      TEXT,
  CONSTRAINT "TaskStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskStatusHistory_taskId_changedAt_idx" ON "TaskStatusHistory"("taskId", "changedAt");
ALTER TABLE "TaskStatusHistory" ADD CONSTRAINT "TaskStatusHistory_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskStatusHistory" ADD CONSTRAINT "TaskStatusHistory_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
