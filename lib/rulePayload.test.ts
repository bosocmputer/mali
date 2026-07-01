import { describe, expect, it } from "vitest";
import {
  createRuleSchema,
  firstRulePayloadError,
  updateRuleSchema,
} from "@/lib/rulePayload";

describe("rulePayload", () => {
  it("accepts clearing fixedDay when updating to offset months", () => {
    const parsed = updateRuleSchema.safeParse({
      id: "rule-15",
      ruleCode: "R-15",
      name: "ภ.ง.ด.51 กึ่งปี",
      taxForm: "ภ.ง.ด.51",
      calcMethod: "offset_months",
      fixedDay: null,
      offset: 8,
      referenceDate: "fiscal_year_end",
      legalRef: "ป.รัษฎากร",
      description: "ยื่นภายใน 60 วันหลังครบ 6 เดือนแรกของรอบบัญชี",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fixedDay).toBeNull();
      expect(parsed.data.offset).toBe(8);
    }
  });

  it("returns an id-specific error only when id is actually missing", () => {
    const parsed = updateRuleSchema.safeParse({
      ruleCode: "R-15",
      name: "ภ.ง.ด.51 กึ่งปี",
      calcMethod: "offset_months",
      fixedDay: null,
      offset: 8,
      referenceDate: "fiscal_year_end",
      legalRef: "ป.รัษฎากร",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(firstRulePayloadError(parsed.error)).toBe("id is required");
    }
  });

  it("rejects offset methods without an offset", () => {
    const parsed = updateRuleSchema.safeParse({
      id: "rule-15",
      calcMethod: "offset_months",
      fixedDay: null,
      offset: null,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(firstRulePayloadError(parsed.error)).toBe("กรุณาระบุจำนวนวัน/เดือน");
    }
  });

  it("requires legal reference when creating a new rule", () => {
    const parsed = createRuleSchema.safeParse({
      ruleCode: "R-16",
      name: "ทดสอบ",
      calcMethod: "fixed_day",
      fixedDay: 15,
      referenceDate: "month_end",
      legalRef: "",
    });

    expect(parsed.success).toBe(false);
  });
});
