-- Update 2 round 2: staff-managed companies (FR-66–70, 86, 105) and notes (FR-93–97).

-- Company: auditor, deactivation, who created / last edited.
ALTER TABLE "Client"
  ADD COLUMN "auditorName"    TEXT,
  ADD COLUMN "isActive"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "serviceEndDate" DATE,
  ADD COLUMN "createdById"    TEXT,
  ADD COLUMN "updatedById"    TEXT,
  ADD COLUMN "updatedAt"      TIMESTAMP(3);
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FR-68: a tax id may appear only once. Branches (round 3) will widen this to (taxId, branch).
-- Production had no duplicates left after the test-data cleanup on 2026-11-17.
CREATE UNIQUE INDEX "Client_taxId_key" ON "Client"("taxId");

-- Notes.
CREATE TYPE "NoteScope" AS ENUM ('PERSONAL', 'SHARED');
CREATE TABLE "Note" (
  "id"        TEXT NOT NULL,
  "ownerId"   TEXT NOT NULL,
  "scope"     "NoteScope" NOT NULL,
  "content"   VARCHAR(500) NOT NULL,
  "color"     TEXT NOT NULL DEFAULT 'yellow',
  "clientId"  TEXT,
  "pinned"    BOOLEAN NOT NULL DEFAULT false,
  "doneAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Note_ownerId_idx" ON "Note"("ownerId");
CREATE INDEX "Note_scope_idx" ON "Note"("scope");
CREATE INDEX "Note_clientId_idx" ON "Note"("clientId");
ALTER TABLE "Note" ADD CONSTRAINT "Note_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
