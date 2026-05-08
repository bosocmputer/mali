/**
 * Rule Engine for MALI
 * Supports two calculation methods:
 *  - "fixed_day"    : due on a fixed day of the following month (e.g. the 15th)
 *  - "offset_days"  : due N days after the base date
 *  - "offset_months": due N months after the base date (last day of that month)
 */

import { adjustDueDate } from "@/lib/holidays";
import { getAllRules } from "@/data/mockData";

export type CalcMethod = "fixed_day" | "offset_days" | "offset_months";

export interface TaxRule {
  ruleCode: string;
  name: string;
  taxForm?: string;
  calcMethod: CalcMethod;
  /** fixed_day: day of next month (1–31) */
  fixedDay?: number;
  /** offset_days / offset_months: amount to add */
  offset?: number;
  /** "month_end" = base is last day of tax month; "fiscal_year_end" = base is FY end date */
  referenceDate: "month_end" | "fiscal_year_end" | "agm_date";
  legalRef: string;
}

// ─── Rule Definitions (ตารางกฎ 15 รายการ) ────────────────────────────────────

export const TAX_RULE_LIST: TaxRule[] = [
  // ก. ภาษีรายเดือน
  {
    ruleCode: "R-01",
    name: "หัก ณ ที่จ่าย (เงินเดือน)",
    taxForm: "ภ.ง.ด.1",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.52, 59",
  },
  {
    ruleCode: "R-02",
    name: "หัก ณ ที่จ่าย (บุคคลธรรมดา)",
    taxForm: "ภ.ง.ด.3",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.3 เตรส",
  },
  {
    ruleCode: "R-03",
    name: "หัก ณ ที่จ่าย (นิติบุคคล)",
    taxForm: "ภ.ง.ด.53",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.3 เตรส",
  },
  {
    ruleCode: "R-04",
    name: "VAT ปกติ",
    taxForm: "ภ.พ.30",
    calcMethod: "fixed_day",
    fixedDay: 23,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.83",
  },
  {
    ruleCode: "R-05",
    name: "VAT ต่างประเทศ",
    taxForm: "ภ.พ.36",
    calcMethod: "fixed_day",
    fixedDay: 15,
    referenceDate: "month_end",
    legalRef: "ป.รัษฎากร ม.83/6",
  },
  {
    ruleCode: "R-06",
    name: "ประกันสังคม",
    taxForm: "ประกันสังคม",
    calcMethod: "fixed_day",
    fixedDay: 23,
    referenceDate: "month_end",
    legalRef: "พ.ร.บ.ประกันสังคม ม.47",
  },
  // ข. ภาษีรายปีและงานประจำปี
  {
    ruleCode: "R-07",
    name: "ประชุมผู้ถือหุ้น (AGM)",
    taxForm: "AGM",
    calcMethod: "offset_months",
    offset: 4,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.พ.พ. ม.1172",
  },
  {
    ruleCode: "R-08",
    name: "ยื่นงบการเงิน (DBD)",
    taxForm: "ส.บช.3",
    calcMethod: "offset_months",
    offset: 5,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.การบัญชี ม.11",
  },
  {
    ruleCode: "R-09",
    name: "ภาษีเงินได้นิติบุคคล",
    taxForm: "ภ.ง.ด.50",
    calcMethod: "offset_days",
    offset: 150,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.รัษฎากร ม.68, 69",
  },
  {
    ruleCode: "R-10",
    name: "รายชื่อผู้ถือหุ้น (บอจ.5)",
    taxForm: "บอจ.5",
    calcMethod: "offset_days",
    offset: 14,
    referenceDate: "agm_date",
    legalRef: "ป.พ.พ. ม.1139",
  },
  // ค. งบการเงินประจำปี workflow
  {
    ruleCode: "R-11",
    name: "จัดทำงบการเงิน (ร่าง)",
    taxForm: "จัดทำงบ",
    calcMethod: "offset_months",
    offset: 2,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.การบัญชี ม.11",
  },
  {
    ruleCode: "R-12",
    name: "ผู้สอบบัญชีรับรองงบ",
    taxForm: "ผู้สอบบัญชี",
    calcMethod: "offset_months",
    offset: 3,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.วิชาชีพบัญชี ม.40",
  },
  {
    ruleCode: "R-13",
    name: "อนุมัติงบในที่ประชุม AGM",
    taxForm: "อนุมัติงบ",
    calcMethod: "offset_months",
    offset: 4,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.พ.พ. ม.1172",
  },
  {
    ruleCode: "R-14",
    name: "นำส่งงบการเงิน (DBD)",
    taxForm: "ส.บช.3",
    calcMethod: "offset_months",
    offset: 5,
    referenceDate: "fiscal_year_end",
    legalRef: "พ.ร.บ.การบัญชี ม.11",
  },
  {
    ruleCode: "R-15",
    name: "ภ.ง.ด.51 กึ่งปี",
    taxForm: "ภ.ง.ด.51",
    calcMethod: "offset_days",
    offset: 60,
    referenceDate: "fiscal_year_end",
    legalRef: "ป.รัษฎากร ม.67 ทวิ",
  },
];

/** Lookup map: taxForm → TaxRule (ใช้ตัวแรกที่พบ) */
export const TAX_RULE_BY_FORM: Record<string, TaxRule> = {};
for (const rule of TAX_RULE_LIST) {
  if (rule.taxForm && !TAX_RULE_BY_FORM[rule.taxForm]) {
    TAX_RULE_BY_FORM[rule.taxForm] = rule;
  }
}

/** Legacy map — ยังคงไว้เพื่อ backward compat กับโค้ดที่อ้างถึง TAX_RULES */
export const TAX_RULES: Record<string, number> = {
  "ภ.ง.ด.50": 150,
  "ภ.ง.ด.51":  60,
  "ภ.พ.30":    23,
  "ภ.ง.ด.1":  15,
  "ภ.ง.ด.3":  15,
  "ภ.ง.ด.53": 15,
  "ภ.พ.36":   15,
};

// ─── Core Calculation Functions ───────────────────────────────────────────────

/** Extract UTC year/month(1-based)/day from a Date (avoids local-timezone shifts) */
function utcParts(d: Date): { y: number; m: number; day: number } {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Last day of a given month/year (UTC midnight) */
export function getLastDayOfMonth(month: number, year: number): Date {
  // Day 0 of next month = last day of this month, in UTC
  return new Date(Date.UTC(year, month, 0));
}

/**
 * Add N calendar months to a date and return the last day of that month.
 * e.g. addMonths(2025-12-31, 5) → 2026-05-31
 */
export function addMonths(base: Date, months: number): Date {
  const { y, m } = utcParts(base);
  const targetMonth = m + months; // 1-based
  const year = y + Math.floor((targetMonth - 1) / 12);
  const month = ((targetMonth - 1) % 12) + 1;
  return getLastDayOfMonth(month, year);
}

/**
 * Calculate due date for "fixed_day" method (UTC-safe):
 * Returns the fixedDay of the month FOLLOWING the base date's month.
 * e.g. base = 2026-03-31, fixedDay = 15 → 2026-04-15
 */
export function fixedDayOfNextMonth(base: Date, fixedDay: number): Date {
  const { y, m } = utcParts(base);
  const nextMonth = m + 1;
  const year = nextMonth > 12 ? y + 1 : y;
  const month = nextMonth > 12 ? 1 : nextMonth;
  return new Date(Date.UTC(year, month - 1, fixedDay));
}

/** Add N days to a date using UTC arithmetic (no timezone shift) */
export function calculateDueDate(base: Date, daysOffset: number): Date {
  const { y, m, day } = utcParts(base);
  return new Date(Date.UTC(y, m - 1, day + daysOffset));
}

/**
 * Main entry point — calculate due date using a TaxRule definition.
 * @param rule     - TaxRule from TAX_RULE_LIST
 * @param baseDate - fiscalYearEndDate or monthEndDate depending on rule.referenceDate
 */
export function calculateDueDateByRule(rule: TaxRule, baseDate: Date): Date {
  switch (rule.calcMethod) {
    case "fixed_day":
      return fixedDayOfNextMonth(baseDate, rule.fixedDay!);
    case "offset_days":
      return calculateDueDate(baseDate, rule.offset!);
    case "offset_months":
      return addMonths(baseDate, rule.offset!);
  }
}

/**
 * Convenience: get due date by tax form name (e.g. "ภ.พ.30").
 * Automatically adjusts for weekends and Thai public holidays.
 * Returns null if no rule found for that form.
 */
export function getDueDateByTaxType(
  taxTypeName: string,
  baseDate: Date
): Date | null {
  // Prefer the dynamic store (runtime-editable); fall back to static TAX_RULE_BY_FORM
  const dynamicRule = getAllRules().find((r) => r.taxForm === taxTypeName);
  const rule: TaxRule | undefined = dynamicRule
    ? {
        ruleCode: dynamicRule.ruleCode,
        name: dynamicRule.name,
        taxForm: dynamicRule.taxForm,
        calcMethod: dynamicRule.calcMethod as CalcMethod,
        fixedDay: dynamicRule.fixedDay,
        offset: dynamicRule.offset,
        referenceDate: dynamicRule.referenceDate as TaxRule["referenceDate"],
        legalRef: dynamicRule.legalRef,
      }
    : TAX_RULE_BY_FORM[taxTypeName];
  if (!rule) return null;
  const raw = calculateDueDateByRule(rule, baseDate);
  return adjustDueDate(raw);
}

/**
 * Get fiscal year end date from fiscal year end month and reference calendar year.
 * Handles non-standard fiscal years (e.g. Apr–Mar).
 */
export function getFiscalYearEndDate(
  fiscalYearEndMonth: number,
  fiscalYearStartMonth: number,
  referenceYear: number
): Date {
  const endYear =
    fiscalYearEndMonth < fiscalYearStartMonth ? referenceYear + 1 : referenceYear;
  return getLastDayOfMonth(fiscalYearEndMonth, endYear);
}
