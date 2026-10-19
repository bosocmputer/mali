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

  const baseRule = {
    ruleCode: "R-16",
    name: "ทดสอบ",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
  };

  it("does not require a legal reference when creating a rule (empty or omitted)", () => {
    expect(createRuleSchema.safeParse({ ...baseRule, legalRef: "" }).success).toBe(true);
    expect(createRuleSchema.safeParse({ ...baseRule, legalRef: "   " }).success).toBe(true);
    expect(createRuleSchema.safeParse(baseRule).success).toBe(true);
  });

  it("still trims a legal reference that is given", () => {
    const parsed = createRuleSchema.safeParse({ ...baseRule, legalRef: "  ป.รัษฎากร ม.67  " });
    expect(parsed.success && parsed.data.legalRef).toBe("ป.รัษฎากร ม.67");
  });

  it("leaves legalRef untouched on a partial update that omits it", () => {
    const parsed = updateRuleSchema.safeParse({ id: "rule-1", name: "ชื่อใหม่" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.legalRef).toBeUndefined();
  });
});
