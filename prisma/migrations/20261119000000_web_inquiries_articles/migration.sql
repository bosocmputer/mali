-- CreateTable WebInquiry
CREATE TABLE IF NOT EXISTS "WebInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'th',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "contactedById" TEXT,
    "contactedAt" TIMESTAMP(3),
    "staffNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable WebArticle
CREATE TABLE IF NOT EXISTS "WebArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverUrl" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'ทีมงาน HASH-TAX',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebInquiry_status_createdAt_idx" ON "WebInquiry"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WebArticle_slug_key" ON "WebArticle"("slug");
CREATE INDEX IF NOT EXISTS "WebArticle_isPublished_publishedAt_idx" ON "WebArticle"("isPublished", "publishedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "WebInquiry" ADD CONSTRAINT "WebInquiry_contactedById_fkey" FOREIGN KEY ("contactedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WebArticle" ADD CONSTRAINT "WebArticle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
