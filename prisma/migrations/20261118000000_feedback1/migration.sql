-- Customer feedback after UAT round 1–5.

-- "ไม่ต้องชำระเพิ่ม" and "ไม่มีภาษีต้องชำระ" mean the same to the office: keep one, "ไม่มีภาษีต้องชำระ".
-- (The enum value stays so old history rows still read; nothing selects it any more.)
UPDATE "Task" SET "paymentType" = 'NO_TAX' WHERE "paymentType" = 'NO_ADDITIONAL';
UPDATE "TaxType" SET "defaultPaymentType" = 'NO_TAX' WHERE "defaultPaymentType" = 'NO_ADDITIONAL';

-- QR / payment slip from the tax office, attached when filing an office-pays task.
ALTER TABLE "Task" ADD COLUMN "paymentQrUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Estimated audit fee next to the auditor's name.
ALTER TABLE "Client" ADD COLUMN "auditFeeEstimate" DECIMAL(14,2);
