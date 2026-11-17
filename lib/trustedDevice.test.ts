import { describe, expect, it } from "vitest";
import { createTrustedDeviceToken, isTrustedDevice, readCookie } from "./trustedDevice";

const S = "secret";
const enrolled = new Date("2026-11-17T00:00:00Z");

describe("trusted device", () => {
  it("accepts its own token within 30 days", () => {
    const { value } = createTrustedDeviceToken("u1", enrolled, 0, S);
    expect(isTrustedDevice(value, "u1", enrolled, 1000, S)).toBe(true);
  });
  it("rejects other users, expired tokens, re-enrolment and tampering", () => {
    const { value } = createTrustedDeviceToken("u1", enrolled, 0, S);
    expect(isTrustedDevice(value, "u2", enrolled, 1000, S)).toBe(false);
    expect(isTrustedDevice(value, "u1", enrolled, 31 * 86_400_000, S)).toBe(false);
    expect(isTrustedDevice(value, "u1", new Date(enrolled.getTime() + 1), 1000, S)).toBe(false);
    expect(isTrustedDevice(value.replace(/.$/, "x"), "u1", enrolled, 1000, S)).toBe(false);
    expect(isTrustedDevice(value, "u1", enrolled, 1000, "other")).toBe(false);
  });
  it("reads a cookie from a header", () => {
    expect(readCookie("a=1; mali.trusted-device=abc.def; b=2", "mali.trusted-device")).toBe("abc.def");
  });
});
