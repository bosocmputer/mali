-- Update 2 round 4: government-site credentials (FR-71–74, NFR-09/10/12) and 2FA (FR-109).

ALTER TABLE "User"
  ADD COLUMN "totpSecretEnc" TEXT,
  ADD COLUMN "totpEnabledAt" TIMESTAMP(3);

CREATE TYPE "GovSystem" AS ENUM ('RD', 'DBD', 'SSO');
CREATE TYPE "CredentialAction" AS ENUM ('VIEW', 'COPY', 'CREATE', 'UPDATE', 'DELETE');

CREATE TABLE "GovCredential" (
  "id"          TEXT NOT NULL,
  "taxId"       TEXT,
  "clientId"    TEXT,
  "system"      "GovSystem" NOT NULL,
  "username"    TEXT NOT NULL,
  "passwordEnc" TEXT NOT NULL,
  "note"        TEXT,
  "updatedById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GovCredential_pkey" PRIMARY KEY ("id"),
  -- shared by tax id, or (no tax id) owned by one company
  CONSTRAINT "GovCredential_owner_check" CHECK ("taxId" IS NOT NULL OR "clientId" IS NOT NULL)
);
CREATE INDEX "GovCredential_taxId_idx" ON "GovCredential"("taxId");
CREATE INDEX "GovCredential_clientId_idx" ON "GovCredential"("clientId");
ALTER TABLE "GovCredential" ADD CONSTRAINT "GovCredential_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovCredential" ADD CONSTRAINT "GovCredential_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CredentialAccessLog" (
  "id"           TEXT NOT NULL,
  "credentialId" TEXT,
  "userId"       TEXT NOT NULL,
  "action"       "CredentialAction" NOT NULL,
  "system"       "GovSystem" NOT NULL,
  "companyLabel" TEXT NOT NULL,
  "username"     TEXT NOT NULL,
  "at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CredentialAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CredentialAccessLog_at_idx" ON "CredentialAccessLog"("at");
CREATE INDEX "CredentialAccessLog_credentialId_idx" ON "CredentialAccessLog"("credentialId");
ALTER TABLE "CredentialAccessLog" ADD CONSTRAINT "CredentialAccessLog_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "GovCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CredentialAccessLog" ADD CONSTRAINT "CredentialAccessLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NFR-12: history rows can't be edited or deleted, not even through a direct DB session.
-- (Deleting a credential only nulls credentialId, which the trigger allows.)
CREATE FUNCTION mali_block_history_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
  END IF;
  IF TG_TABLE_NAME = 'CredentialAccessLog'
     AND NEW."credentialId" IS NULL
     AND (to_jsonb(NEW) - 'credentialId') = (to_jsonb(OLD) - 'credentialId') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CredentialAccessLog_append_only"
  BEFORE UPDATE OR DELETE ON "CredentialAccessLog"
  FOR EACH ROW EXECUTE FUNCTION mali_block_history_change();
