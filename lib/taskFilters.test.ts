import { describe, expect, it } from "vitest";
import { getTaskPeriodDateRange } from "./taskFilters";

function dates(range: ReturnType<typeof getTaskPeriodDateRange>) {
  return {
    gte: range?.gte.toISOString().slice(0, 10),
    lt: range?.lt.toISOString().slice(0, 10),
  };
}

describe("task period filters", () => {
  it("filters a selected year by fiscal period, not due date year", () => {
    expect(dates(getTaskPeriodDateRange({ year: 2026 }))).toEqual({
      gte: "2026-01-01",
      lt: "2027-01-01",
    });
  });

  it("filters a selected month within the selected fiscal period year", () => {
    expect(dates(getTaskPeriodDateRange({ month: 6, year: 2026 }))).toEqual({
      gte: "2026-06-01",
      lt: "2026-07-01",
    });
  });

  it("uses the current UTC year when only a month is provided", () => {
    expect(
      dates(
        getTaskPeriodDateRange(
          { month: 12 },
          new Date("2026-06-24T00:00:00.000Z")
        )
      )
    ).toEqual({
      gte: "2026-12-01",
      lt: "2027-01-01",
    });
  });

  it("does not apply a period range when month and year are both unset", () => {
    expect(getTaskPeriodDateRange({})).toBeUndefined();
  });
});
