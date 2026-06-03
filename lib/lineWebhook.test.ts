import { describe, expect, it } from "vitest";
import {
  createLineSignature,
  parseLineTextCommand,
  verifyLineSignature,
} from "./lineWebhook";

describe("LINE webhook helpers", () => {
  it("verifies valid LINE signatures", () => {
    const body = JSON.stringify({ events: [] });
    const channelSecret = "test-secret";
    const signature = createLineSignature(body, channelSecret);

    expect(verifyLineSignature({ body, channelSecret, signature })).toBe(true);
  });

  it("rejects invalid LINE signatures", () => {
    const body = JSON.stringify({ events: [] });

    expect(
      verifyLineSignature({
        body,
        channelSecret: "test-secret",
        signature: "invalid-signature",
      })
    ).toBe(false);
  });

  it("parses test commands", () => {
    expect(parseLineTextCommand("test")).toEqual({ kind: "test" });
    expect(parseLineTextCommand("ทดสอบ")).toEqual({ kind: "test" });
  });

  it("parses link commands", () => {
    expect(parseLineTextCommand("MALI 123456")).toEqual({
      kind: "link",
      token: "123456",
    });
    expect(parseLineTextCommand("เชื่อม 654321")).toEqual({
      kind: "link",
      token: "654321",
    });
  });

  it("falls back to help for unknown text", () => {
    expect(parseLineTextCommand("hello")).toEqual({ kind: "help" });
  });
});
