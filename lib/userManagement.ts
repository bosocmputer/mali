import { randomInt } from "node:crypto";

const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL_CHARS = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

export function generateTemporaryPassword(length = 14): string {
  if (!Number.isInteger(length) || length < 12) {
    throw new Error("Temporary password length must be at least 12 characters");
  }

  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const remaining = Array.from({ length: length - required.length }, () =>
    pick(ALL_CHARS)
  );

  return shuffle([...required, ...remaining]).join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidTemporaryPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%&*?]/.test(password)
  );
}
