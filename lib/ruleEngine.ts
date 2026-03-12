/**
 * Rule Engine for MALI
 * Calculates tax filing due dates based on fiscal year end date and rule offset.
 */

export const TAX_RULES: Record<string, number> = {
  "ภ.ง.ด.50": 150, // Annual corporate income tax: 150 days after fiscal year end
  "ภ.ง.ด.51": 60, // Mid-year corporate income tax: 60 days after 6-month mark
  "ภ.พ.30": 15, // Monthly VAT: 15 days after month end
  "ภ.ง.ด.1": 7, // Monthly withholding tax (salary): 7 days after month end
  "ภ.ง.ด.3": 7, // Monthly withholding tax (services): 7 days after month end
};

/**
 * Calculate due date from fiscal year end date and days offset.
 * @param fiscalYearEndDate - The last day of the fiscal year
 * @param daysOffset - Number of days after fiscal year end
 * @returns The calculated due date
 */
export function calculateDueDate(
  fiscalYearEndDate: Date,
  daysOffset: number
): Date {
  const due = new Date(fiscalYearEndDate);
  due.setDate(due.getDate() + daysOffset);
  return due;
}

/**
 * Get the last day of a given month/year.
 * @param month - Month 1–12
 * @param year - Gregorian year
 */
export function getLastDayOfMonth(month: number, year: number): Date {
  // Day 0 of month+1 = last day of month
  return new Date(year, month, 0);
}

/**
 * Get fiscal year end date from fiscal year end month and reference calendar year.
 * Handles non-standard fiscal years (e.g., Apr–Mar fiscal year ending in March of next year).
 *
 * @param fiscalYearEndMonth - 1–12
 * @param fiscalYearStartMonth - 1–12
 * @param referenceYear - The Gregorian year to anchor the calculation
 */
export function getFiscalYearEndDate(
  fiscalYearEndMonth: number,
  fiscalYearStartMonth: number,
  referenceYear: number
): Date {
  let endYear = referenceYear;
  // If fiscal year wraps (e.g., starts in July, ends in June), end is next year
  if (fiscalYearEndMonth < fiscalYearStartMonth) {
    endYear = referenceYear + 1;
  }
  return getLastDayOfMonth(fiscalYearEndMonth, endYear);
}

/**
 * Get due date by tax type name using the standard rule offsets.
 */
export function getDueDateByTaxType(
  taxTypeName: string,
  fiscalYearEndDate: Date
): Date | null {
  const offset = TAX_RULES[taxTypeName];
  if (offset === undefined) return null;
  return calculateDueDate(fiscalYearEndDate, offset);
}
