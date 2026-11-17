import { describe, expect, it } from "vitest";
import { checkRecoveryCode, hashRecoveryCode } from "./mfaRecovery";

const S = "s";
const now = new Date("2026-11-17T10:00:00Z");
const state = (over = {}) => ({ hash: hashRecoveryCode("u1", "123456", S), expiresAt: new Date(now.getTime() + 60_000), attempts: 0, ...over });

describe("checkRecoveryCode", () => {
  it("accepts the right code for the right user", () => {
    expect(checkRecoveryCode(state(), "u1", "123456", now, S)).toBe("ok");
    expect(checkRecoveryCode(state(), "u2", "123456", now, S)).toBe("invalid");
    expect(checkRecoveryCode(state(), "u1", "654321", now, S)).toBe("invalid");
  });
  it("refuses expired, exhausted, or missing codes", () => {
    expect(checkRecoveryCode(state({ expiresAt: new Date(now.getTime() - 1) }), "u1", "123456", now, S)).toBe("expired");
    expect(checkRecoveryCode(state({ attempts: 5 }), "u1", "123456", now, S)).toBe("too_many");
    expect(checkRecoveryCode({ hash: null, expiresAt: null, attempts: 0 }, "u1", "123456", now, S)).toBe("none");
  });
});
