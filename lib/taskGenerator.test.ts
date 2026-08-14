import { describe, expect, it } from "vitest";
import {
  buildGenerationMessage,
  getNextFiscalYearEndDate,
  monthlyBackfillBaseDates,
  type GenerationMessageResult,
} from "./taskGenerationUtils";
import type { Client } from "../types";

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-test",
    companyName: "Test Co., Ltd.",
    businessType: "service",
    fiscalYearStart: 1,
    fiscalYearEnd: 12,
    fiscalYearEndDay: 31,
    isNonStandard: false,
    taxTypes: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function result(overrides: Partial<GenerationMessageResult>): GenerationMessageResult {
  return {
    created: 0,
    skipped: 0,
    wouldCreate: 0,
    dryRun: false,
    ...overrides,
  };
}

describe("task generator pure helpers", () => {
  it("uses the current fiscal year end when it is still upcoming", () => {
    const next = getNextFiscalYearEndDate(
      client({ fiscalYearEnd: 12, fiscalYearEndDay: 31 }),
      new Date("2026-05-20T00:00:00.000Z")
    );

    expect(next.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("moves to the next year when this year's fiscal year end has passed", () => {
    const next = getNextFiscalYearEndDate(
      client({ fiscalYearEnd: 3, fiscalYearEndDay: 31 }),
      new Date("2026-05-20T00:00:00.000Z")
    );

    expect(next.toISOString().slice(0, 10)).toBe("2027-03-31");
  });

  it("clamps impossible fiscal year end days to the last day of the month", () => {
    const next = getNextFiscalYearEndDate(
      client({ fiscalYearEnd: 2, fiscalYearEndDay: 31 }),
      new Date("2026-01-01T00:00:00.000Z")
    );

    expect(next.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("describes dry-run output without implying writes happened", () => {
    expect(
      buildGenerationMessage(result({ dryRun: true, wouldCreate: 4, skipped: 2 }))
    ).toContain("Dry-run");
  });

  it("describes real generation output using created count", () => {
    expect(buildGenerationMessage(result({ created: 3, skipped: 1 }))).toContain(
      "สร้างงานใหม่ 3 งาน"
    );
  });
});

describe("monthlyBackfillBaseDates", () => {
  it("returns one entry when from and now are the same month", () => {
    const dates = monthlyBackfillBaseDates(
      new Date("2026-07-01T00:00:00.000Z"),
      new Date("2026-07-15T00:00:00.000Z")
    );
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-07-31"]);
  });

  it("returns every month end from the backfill start through the current month, oldest first", () => {
    const dates = monthlyBackfillBaseDates(
      new Date("2026-07-01T00:00:00.000Z"),
      new Date("2026-08-14T00:00:00.000Z")
    );
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-07-31",
      "2026-08-31",
    ]);
  });

  it("handles a backfill range spanning a year boundary", () => {
    const dates = monthlyBackfillBaseDates(
      new Date("2026-11-01T00:00:00.000Z"),
      new Date("2027-01-10T00:00:00.000Z")
    );
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-11-30",
      "2026-12-31",
      "2027-01-31",
    ]);
  });

  it("returns an empty list when from is after now", () => {
    const dates = monthlyBackfillBaseDates(
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-08-01T00:00:00.000Z")
    );
    expect(dates).toEqual([]);
  });
});
