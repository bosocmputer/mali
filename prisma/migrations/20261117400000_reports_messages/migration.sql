-- Update 2 round 5: payment message (answer 16), penalties (FR-102), auditor steps (FR-101).

ALTER TABLE "Client" ADD COLUMN "monthlyFee" DECIMAL(14,2);
ALTER TABLE "User" ADD COLUMN "politeParticle" TEXT NOT NULL DEFAULT 'ครับ';

CREATE TYPE "PenaltyPayer" AS ENUM ('CLIENT', 'OFFICE');
ALTER TABLE "Task"
  ADD COLUMN "penaltyAmount"   DECIMAL(14,2),
  ADD COLUMN "surchargeAmount" DECIMAL(14,2),
  ADD COLUMN "penaltyBorneBy"  "PenaltyPayer",
  ADD COLUMN "penaltyReason"   TEXT,
  ADD COLUMN "auditorSentAt"   DATE,
  ADD COLUMN "auditorReportAt" DATE;

CREATE TABLE "AppSetting" (
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Transfer details the customer gave (editable by supervisors afterwards)
INSERT INTO "AppSetting" ("key", "value", "updatedAt") VALUES
  ('payment.bankName', 'ธนาคารกรุงศรี', CURRENT_TIMESTAMP),
  ('payment.accountNo', '7181299230', CURRENT_TIMESTAMP),
  ('payment.accountName', 'บริษัท แฮช-แท็คซ์ แอคเคาท์ติ้ง แอนด์ ออดิท จำกัด', CURRENT_TIMESTAMP),
  ('payment.closing', 'ถ้าชำระมาแล้วรบกวนส่งสลิปในกลุ่มให้ด้วยนะ', CURRENT_TIMESTAMP);
