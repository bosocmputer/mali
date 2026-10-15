import { describe, expect, it } from "vitest";
import { getLivePriority } from "./taskPriority";
import { daysUntil } from "./utils";

const NOW = new Date("2026-10-15T03:00:00.000Z"); // 10:00 on 15 Oct, Thailand

function p(status: "TODO" | "PROCESSING" | "SUBMITTED", due: string) {
  return getLivePriority({ status, dueDate: `${due}T00:00:00.000Z` }, NOW);
}

describe("getLivePriority", () => {
  it("has no urgency once submitted, whatever the due date", () => {
    expect(p("SUBMITTED", "2026-09-01")).toBeNull();
    expect(p("SUBMITTED", "2026-10-15")).toBeNull();
  });

  it("is OVERDUE only after the due day has passed — a task due today is not overdue yet", () => {
    expect(p("TODO", "2026-10-14")).toBe("OVERDUE");
    expect(p("PROCESSING", "2026-09-15")).toBe("OVERDUE");
    expect(p("TODO", "2026-10-15")).toBe("CRITICAL");
  });

  it("buckets upcoming tasks by days left", () => {
    expect(p("TODO", "2026-10-18")).toBe("CRITICAL"); // 3 days
    expect(p("TODO", "2026-10-19")).toBe("HIGH"); // 4 days
    expect(p("TODO", "2026-10-22")).toBe("HIGH"); // 7 days
    expect(p("TODO", "2026-10-23")).toBe("MEDIUM"); // 8 days
    expect(p("TODO", "2026-10-29")).toBe("MEDIUM"); // 14 days
    expect(p("TODO", "2026-10-30")).toBe("LOW"); // 15 days
  });

  it("flips to overdue at the Thai midnight, not at 07:00", () => {
    const due = "2026-10-15T00:00:00.000Z";
    const lateDueDay = new Date("2026-10-15T16:59:00.000Z"); // 23:59 on 15 Oct Thai
    const nextDay = new Date("2026-10-15T17:01:00.000Z"); // 00:01 on 16 Oct Thai
    expect(getLivePriority({ status: "TODO", dueDate: due }, lateDueDay)).toBe("CRITICAL");
    expect(getLivePriority({ status: "TODO", dueDate: due }, nextDay)).toBe("OVERDUE");
  });
});

describe("daysUntil", () => {
  it("counts Thai calendar days", () => {
    expect(daysUntil("2026-10-15T00:00:00.000Z", NOW)).toBe(0);
    expect(daysUntil("2026-10-14T00:00:00.000Z", NOW)).toBe(-1);
    expect(daysUntil("2026-10-20T00:00:00.000Z", NOW)).toBe(5);
  });
});
