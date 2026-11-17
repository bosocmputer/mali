import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, totpCode, verifyTotp } from "./totp";

// RFC 6238 appendix B (SHA-1), secret "12345678901234567890"
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("totp", () => {
  it("matches the RFC 6238 test vectors (last 6 digits)", () => {
    expect(totpCode(SECRET, 59_000, 30, 8)).toBe("94287082");
    expect(totpCode(SECRET, 1111111109_000, 30, 8)).toBe("07081804");
    expect(totpCode(SECRET, 2000000000_000, 30, 8)).toBe("69279037");
    expect(totpCode(SECRET, 59_000)).toBe("287082");
  });

  it("base32 round-trips", () => {
    const buf = Buffer.from([0, 1, 2, 250, 255]);
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
  });

  it("accepts one step of clock drift, not more", () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(SECRET, totpCode(SECRET, now), now)).toBe(true);
    expect(verifyTotp(SECRET, totpCode(SECRET, now - 30_000), now)).toBe(true);
    expect(verifyTotp(SECRET, totpCode(SECRET, now - 90_000), now)).toBe(false);
    expect(verifyTotp(SECRET, "12345", now)).toBe(false);
  });
});
