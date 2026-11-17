-- Update 2 round 3: branches (FR-88–92, customer answer 8).
-- One company record per branch. 00000 = head office. A tax id may appear once per branch code.
ALTER TABLE "Client"
  ADD COLUMN "branchCode" TEXT NOT NULL DEFAULT '00000',
  ADD COLUMN "branchName" TEXT;

DROP INDEX "Client_taxId_key";
CREATE UNIQUE INDEX "Client_taxId_branchCode_key" ON "Client"("taxId", "branchCode");
