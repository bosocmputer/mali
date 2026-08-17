import { describe, expect, it } from "vitest";
import {
  calculateDueDateByRule,
  getHalfYearEndDate,
  TAX_RULE_BY_FORM,
  type TaxRule,
} from "./ruleEngine";

describe("getHalfYearEndDate", () => {
  it("returns the last day of the 6th month before a calendar-year fiscal year end", () => {
    const half = getHalfYearEndDate(new Date("2026-12-31T00:00:00.000Z"));
    expect(half.toISOString().slice(0, 10)).toBe("2026-06-30");
  });

  it("stays within the same year when the fiscal year end is in the first half", () => {
    const half = getHalfYearEndDate(new Date("2027-03-31T00:00:00.000Z"));
    expect(half.toISOString().slice(0, 10)).toBe("2025-09-30");
  });
});

describe("calculateDueDateByRule — half_year_end reference", () => {
  const por51Rule: TaxRule = {
    ruleCode: "R-15",
    name: "ภ.ง.ด.51 กึ่งปี",
    taxForm: "ภ.ง.ด.51",
    calcMethod: "offset_days",
    offset: 60,
    referenceDate: "half_year_end",
    legalRef: "ป.รัษฎากร ม.67 ทวิ",
  };

  it("computes ภ.ง.ด.51 due date as 60 days after the half-year mark, same fiscal year", () => {
    // FY end 2026-12-31 → half-year mark 2026-06-30 → +60 days = 2026-08-29
    const due = calculateDueDateByRule(por51Rule, new Date("2026-12-31T00:00:00.000Z"));
    expect(due.toISOString().slice(0, 10)).toBe("2026-08-29");
  });

  it("does not roll the due date into the following year", () => {
    const due = calculateDueDateByRule(por51Rule, new Date("2026-12-31T00:00:00.000Z"));
    expect(due.getUTCFullYear()).toBe(2026);
  });
});

describe("TAX_RULE_BY_FORM source-of-truth sanity", () => {
  it("keeps R-14 (ส.บช.3) and the ภ.ง.ด.51 rule as distinct tax forms", () => {
    expect(TAX_RULE_BY_FORM["ส.บช.3"].ruleCode).not.toBe(
      TAX_RULE_BY_FORM["ภ.ง.ด.51"].ruleCode
    );
  });

  it("defines ภ.ง.ด.51 with the half_year_end reference", () => {
    expect(TAX_RULE_BY_FORM["ภ.ง.ด.51"].referenceDate).toBe("half_year_end");
  });
});
