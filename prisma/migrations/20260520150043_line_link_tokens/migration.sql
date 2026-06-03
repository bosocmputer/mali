-- CreateTable
CREATE TABLE "LineLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineLinkToken_tokenHash_key" ON "LineLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LineLinkToken_userId_idx" ON "LineLinkToken"("userId");

-- CreateIndex
CREATE INDEX "LineLinkToken_expiresAt_idx" ON "LineLinkToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "LineLinkToken" ADD CONSTRAINT "LineLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
