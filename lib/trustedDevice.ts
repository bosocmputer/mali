import { createHmac, timingSafeEqual } from "crypto";

/**
 * "Remember this device for 30 days" after a TOTP login (customer-approved proposal 13), so the
 * 30-minute idle logout only asks for the password. The token is bound to the user and to the
 * moment they enrolled 2FA: a supervisor reset (new enrolment) invalidates every remembered device.
 */
export const TRUST_DAYS = 30;

export const trustedDeviceCookieName = () => `${process.env.AUTH_COOKIE_PREFIX ?? "mali"}.trusted-device`;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createTrustedDeviceToken(
  userId: string,
  totpEnabledAt: Date,
  now = Date.now(),
  secret = process.env.NEXTAUTH_SECRET ?? ""
): { value: string; maxAge: number } {
  const exp = now + TRUST_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${totpEnabledAt.getTime()}.${exp}`;
  return { value: `${payload}.${sign(payload, secret)}`, maxAge: TRUST_DAYS * 24 * 60 * 60 };
}

export function isTrustedDevice(
  token: string | undefined,
  userId: string,
  totpEnabledAt: Date | null,
  now = Date.now(),
  secret = process.env.NEXTAUTH_SECRET ?? ""
): boolean {
  if (!token || !totpEnabledAt || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [uid, enrolledAt, exp, sig] = parts;
  if (uid !== userId || Number(enrolledAt) !== totpEnabledAt.getTime() || Number(exp) < now) return false;
  const expected = Buffer.from(sign(`${uid}.${enrolledAt}.${exp}`, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** 2FA is on unless explicitly switched off (MFA_ENFORCED=false), e.g. for an emergency. */
export const isMfaEnforced = () => process.env.MFA_ENFORCED !== "false";
