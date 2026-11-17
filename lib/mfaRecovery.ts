import { createHmac, randomInt, timingSafeEqual } from "crypto";

/**
 * Lost or changed phone: a one-time code sent to the person's linked LINE lets them sign in
 * once and set up their authenticator app again. Only a keyed hash is stored.
 */
export const RECOVERY_TTL_MS = 10 * 60 * 1000;
export const RECOVERY_MAX_ATTEMPTS = 5;
export const RECOVERY_RESEND_MS = 60 * 1000;

export const generateRecoveryCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export function hashRecoveryCode(userId: string, code: string, secret = process.env.NEXTAUTH_SECRET ?? ""): string {
  return createHmac("sha256", secret).update(`mfa-recovery:${userId}:${code}`).digest("hex");
}

export type RecoveryState = { hash: string | null; expiresAt: Date | null; attempts: number };

export function checkRecoveryCode(
  state: RecoveryState,
  userId: string,
  code: string,
  now = new Date(),
  secret?: string
): "ok" | "none" | "expired" | "too_many" | "invalid" {
  if (!state.hash || !state.expiresAt) return "none";
  if (state.expiresAt < now) return "expired";
  if (state.attempts >= RECOVERY_MAX_ATTEMPTS) return "too_many";
  if (!/^\d{6}$/.test(code.trim())) return "invalid";
  const a = Buffer.from(hashRecoveryCode(userId, code.trim(), secret));
  const b = Buffer.from(state.hash);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "invalid";
}
