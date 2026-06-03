import { describe, expect, it } from "vitest";
import {
  generateTemporaryPassword,
  isValidTemporaryPassword,
  normalizeEmail,
} from "@/lib/userManagement";

describe("userManagement", () => {
  it("generates a strong default temporary password", () => {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(14);
    expect(isValidTemporaryPassword(password)).toBe(true);
  });

  it("generates a strong temporary password at a custom valid length", () => {
    const password = generateTemporaryPassword(20);

    expect(password).toHaveLength(20);
    expect(isValidTemporaryPassword(password)).toBe(true);
  });

  it("rejects temporary password lengths below the production minimum", () => {
    expect(() => generateTemporaryPassword(8)).toThrow(
      "Temporary password length must be at least 12 characters"
    );
  });

  it("normalizes emails before storage", () => {
    expect(normalizeEmail("  Boss@MALI.COM  ")).toBe("boss@mali.com");
  });

  it("flags weak temporary passwords", () => {
    expect(isValidTemporaryPassword("onlylowercase")).toBe(false);
    expect(isValidTemporaryPassword("NoSymbol12345")).toBe(false);
  });
});
