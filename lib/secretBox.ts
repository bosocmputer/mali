import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "crypto";

/**
 * NFR-09: AES-256-GCM for secrets stored in the database (government-site passwords, TOTP
 * secrets). The key lives outside the database: CREDENTIALS_KEY (32 bytes, base64) when set,
 * otherwise derived from NEXTAUTH_SECRET with HKDF so a deployment works without a new setting.
 * Changing the key source makes existing secrets unreadable — set CREDENTIALS_KEY once and keep it.
 *
 * Stored form: "v1:<iv b64>:<tag b64>:<ciphertext b64>".
 */
function key(env: NodeJS.ProcessEnv = process.env): Buffer {
  if (env.CREDENTIALS_KEY) {
    const k = Buffer.from(env.CREDENTIALS_KEY, "base64");
    if (k.length !== 32) throw new Error("CREDENTIALS_KEY must be 32 bytes, base64");
    return k;
  }
  if (!env.NEXTAUTH_SECRET) throw new Error("No encryption key: set CREDENTIALS_KEY or NEXTAUTH_SECRET");
  return Buffer.from(hkdfSync("sha256", env.NEXTAUTH_SECRET, "mali", "mali-secret-box-v1", 32));
}

export function encryptSecret(plain: string, env?: NodeJS.ProcessEnv): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(env), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(stored: string, env?: NodeJS.ProcessEnv): string {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== "v1" || !iv || !tag || data === undefined) throw new Error("Unknown secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(env), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/** Short fingerprint of the active key, for logs/diagnostics (never the key itself). */
export const keyFingerprint = (env?: NodeJS.ProcessEnv) =>
  createHash("sha256").update(key(env)).digest("hex").slice(0, 8);
