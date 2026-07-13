-- AlterTable
ALTER TABLE "Task" ADD COLUMN "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Migrate existing single URL to array
UPDATE "Task" SET "evidenceUrls" = ARRAY["evidenceUrl"] WHERE "evidenceUrl" IS NOT NULL AND "evidenceUrl" != '';

-- Drop old column
ALTER TABLE "Task" DROP COLUMN IF EXISTS "evidenceUrl";
