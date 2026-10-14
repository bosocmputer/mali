import { describe, expect, it, vi } from "vitest";
import { LineSendError, sendLineMessage } from "./lineClient";

function response(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

function run(fetchFn: typeof fetch, extra: Parameters<typeof sendLineMessage>[2] = {}) {
  const sleep = vi.fn(async () => {});
  const promise = sendLineMessage("U123", { type: "flex" }, { token: "t", fetchFn, sleep, ...extra });
  return { promise, sleep };
}

describe("sendLineMessage", () => {
  it("resolves on the first successful attempt without sleeping", async () => {
    const fetchFn = vi.fn().mockResolvedValue(response(200)) as unknown as typeof fetch;
    const { promise, sleep } = run(fetchFn);
    await expect(promise).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("fails fast with a clear error when the token is not configured", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await expect(
      sendLineMessage("U123", "hi", { token: "", fetchFn })
    ).rejects.toThrow(/LINE_CHANNEL_ACCESS_TOKEN/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("retries a 5xx and succeeds on a later attempt", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200)) as unknown as typeof fetch;
    const { promise, sleep } = run(fetchFn);
    await expect(promise).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries 429 rate limiting", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(response(429, { message: "rate limit" }))
      .mockResolvedValueOnce(response(200)) as unknown as typeof fetch;
    const { promise } = run(fetchFn);
    await expect(promise).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries when the network call itself throws", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(response(200)) as unknown as typeof fetch;
    const { promise } = run(fetchFn);
    await expect(promise).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 4xx such as an invalid token, and surfaces LINE's message", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(response(401, { message: "Authentication failed" })) as unknown as typeof fetch;
    const { promise, sleep } = run(fetchFn);
    await expect(promise).rejects.toMatchObject({
      name: "LineSendError",
      status: 401,
      retryable: false,
      message: expect.stringContaining("Authentication failed"),
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("gives up after 3 attempts and throws the last error", async () => {
    const fetchFn = vi.fn().mockResolvedValue(response(500)) as unknown as typeof fetch;
    const { promise, sleep } = run(fetchFn);
    await expect(promise).rejects.toBeInstanceOf(LineSendError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("never puts the access token in the error message", async () => {
    const fetchFn = vi.fn().mockResolvedValue(response(400, { message: "bad" })) as unknown as typeof fetch;
    const { promise } = run(fetchFn, { token: "super-secret-token" });
    await expect(promise).rejects.not.toThrow(/super-secret-token/);
  });
});
