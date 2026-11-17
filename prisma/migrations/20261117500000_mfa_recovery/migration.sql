-- Lost authenticator app: one-time recovery code sent over LINE (stored as a hash).
ALTER TABLE "User"
  ADD COLUMN "mfaRecoveryHash" TEXT,
  ADD COLUMN "mfaRecoveryExpiresAt" TIMESTAMP(3),
  ADD COLUMN "mfaRecoveryAttempts" INTEGER NOT NULL DEFAULT 0;
