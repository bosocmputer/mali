import { afterEach, describe, expect, it } from "vitest";
import { appUrl, getAppBaseUrl, reminderListLink, taskLink } from "./appLinks";

const BASE = "http://10.158.8.86:3000";

describe("appLinks", () => {
  afterEach(() => {
    delete process.env.NEXTAUTH_URL;
  });

  it("builds the base from NEXTAUTH_URL without a trailing slash", () => {
    process.env.NEXTAUTH_URL = `${BASE}/`;
    expect(getAppBaseUrl()).toBe(BASE);
    expect(appUrl("/tasks")).toBe(`${BASE}/tasks`);
  });

  it("returns undefined when no base URL is configured, so cards simply omit the button", () => {
    delete process.env.NEXTAUTH_URL;
    expect(appUrl("/tasks")).toBeUndefined();
    expect(taskLink("abc")).toBeUndefined();
  });

  it("links to a single task through the taskId parameter the tasks page already understands", () => {
    expect(taskLink("task-1", BASE)).toBe(`${BASE}/tasks?taskId=task-1`);
    expect(taskLink("a b&c", BASE)).toBe(`${BASE}/tasks?taskId=a%20b%26c`);
  });

  it("links an overdue escalation to the overdue list and a D-N reminder to that due date", () => {
    expect(reminderListLink(undefined, new Date("2026-09-15T00:00:00.000Z"), BASE)).toBe(`${BASE}/tasks?status=OVERDUE`);
    expect(reminderListLink(7, new Date("2026-10-22T00:00:00.000Z"), BASE)).toBe(`${BASE}/tasks?due=2026-10-22`);
    expect(reminderListLink(1, new Date("2026-10-16T00:00:00.000Z"), BASE)).toBe(`${BASE}/tasks?due=2026-10-16`);
  });
});
