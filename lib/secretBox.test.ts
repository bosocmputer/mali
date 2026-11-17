import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secretBox";

const envA = { NEXTAUTH_SECRET: "a-secret" } as unknown as NodeJS.ProcessEnv;
const envB = { CREDENTIALS_KEY: Buffer.alloc(32, 7).toString("base64") } as unknown as NodeJS.ProcessEnv;

describe("secretBox (AES-256-GCM)", () => {
  it("round-trips Thai text and gives a different ciphertext each time", () => {
    const a = encryptSecret("รหัสผ่าน#1", envA);
    const b = encryptSecret("รหัสผ่าน#1", envA);
    expect(a).not.toBe(b);
    expect(a).not.toContain("รหัสผ่าน");
    expect(decryptSecret(a, envA)).toBe("รหัสผ่าน#1");
  });

  it("fails with another key or tampered data", () => {
    const stored = encryptSecret("x", envA);
    expect(() => decryptSecret(stored, envB)).toThrow();
    const parts = stored.split(":");
    parts[3] = Buffer.from("y").toString("base64");
    expect(() => decryptSecret(parts.join(":"), envA)).toThrow();
  });

  it("rejects a key that is not 32 bytes", () => {
    expect(() => encryptSecret("x", { CREDENTIALS_KEY: "c2hvcnQ=" } as unknown as NodeJS.ProcessEnv)).toThrow();
  });
});
