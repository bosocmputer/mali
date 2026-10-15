import { describe, expect, it } from "vitest";
import { bangkokDateString, startOfTodayUtc } from "./utils";
import { compareTasksByUrgency } from "./taskOrder";

function t(id: string, status: "TODO" | "PROCESSING" | "SUBMITTED", due: string, company = "A", tax = "ภ.ง.ด.3") {
  return { id, status, dueDate: `${due}T00:00:00.000Z`, client: { companyName: company }, taxType: { name: tax } };
}
const order = (tasks: ReturnType<typeof t>[]) =>
  [...tasks].sort((x, y) => compareTasksByUrgency(x as never, y as never)).map((x) => x.id);

describe("compareTasksByUrgency", () => {
  it("puts unfinished tasks before submitted ones even when the submitted one is older or critical", () => {
    expect(order([t("done", "SUBMITTED", "2026-08-15"), t("todo", "TODO", "2026-12-15")])).toEqual(["todo", "done"]);
  });

  it("orders unfinished tasks oldest due date first, so overdue is on top", () => {
    expect(
      order([t("future", "TODO", "2026-11-15"), t("overdue", "TODO", "2026-09-15"), t("today", "PROCESSING", "2026-10-15")])
    ).toEqual(["overdue", "today", "future"]);
  });

  it("does not separate TODO from PROCESSING: urgency is by due date", () => {
    expect(order([t("a", "TODO", "2026-10-20"), t("b", "PROCESSING", "2026-10-10")])).toEqual(["b", "a"]);
  });

  it("orders submitted tasks most recently due first", () => {
    expect(order([t("old", "SUBMITTED", "2026-07-15"), t("recent", "SUBMITTED", "2026-09-15")])).toEqual(["recent", "old"]);
  });

  it("is stable for equal due dates by company then tax type", () => {
    expect(
      order([t("b2", "TODO", "2026-10-15", "B", "ก"), t("a2", "TODO", "2026-10-15", "A", "ข"), t("a1", "TODO", "2026-10-15", "A", "ก")])
    ).toEqual(["a1", "a2", "b2"]);
  });
});

describe("startOfTodayUtc", () => {
  it("uses the Thai calendar date, not the UTC date", () => {
    // 2026-10-14 17:30 UTC is already 00:30 on 15 Oct in Thailand
    expect(bangkokDateString(new Date("2026-10-14T17:30:00.000Z"))).toBe("2026-10-15");
    expect(startOfTodayUtc(new Date("2026-10-14T17:30:00.000Z")).toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });

  it("a task due today is not overdue at any time of that Thai day", () => {
    const dueToday = new Date("2026-10-15T00:00:00.000Z");
    for (const now of ["2026-10-14T17:00:00.000Z", "2026-10-15T01:00:00.000Z", "2026-10-15T16:59:00.000Z"]) {
      expect(dueToday < startOfTodayUtc(new Date(now))).toBe(false);
    }
  });

  it("a task due yesterday is overdue", () => {
    expect(new Date("2026-10-14T00:00:00.000Z") < startOfTodayUtc(new Date("2026-10-15T01:00:00.000Z"))).toBe(true);
  });
});
