import { getLastDayOfMonth } from "@/lib/ruleEngine";
import type { Client } from "@/types";

export type GenerationMessageResult = {
  created: number;
  skipped: number;
  wouldCreate: number;
  dryRun: boolean;
};

export function getNextFiscalYearEndDate(client: Client, now = new Date()): Date {
  const month = client.fiscalYearEnd;
  const requestedDay = client.fiscalYearEndDay;
  const thisYear = now.getUTCFullYear();

  function buildDate(year: number): Date {
    const lastDay = getLastDayOfMonth(month, year).getUTCDate();
    const day = Math.min(requestedDay, lastDay);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const candidate = buildDate(thisYear);
  if (candidate >= now) return candidate;
  return buildDate(thisYear + 1);
}

/** Monthly base dates from `from` (inclusive) through `now`'s month (inclusive), oldest first. */
export function monthlyBackfillBaseDates(from: Date, now: Date): Date[] {
  const dates: Date[] = [];
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth() + 1; // 1-based
  const nowLastDay = getLastDayOfMonth(now.getUTCMonth() + 1, now.getUTCFullYear());

  while (true) {
    const candidate = getLastDayOfMonth(month, year);
    if (candidate > nowLastDay) break;
    dates.push(candidate);
    month = month === 12 ? 1 : month + 1;
    year = month === 1 ? year + 1 : year;
  }

  return dates;
}

export function buildGenerationMessage(result: GenerationMessageResult): string {
  if (result.dryRun) {
    return `Dry-run: จะสร้างงานใหม่ ${result.wouldCreate} งาน (ข้าม ${result.skipped} งานที่มีอยู่แล้ว)`;
  }

  return `สร้างงานใหม่ ${result.created} งาน (ข้าม ${result.skipped} งานที่มีอยู่แล้ว)`;
}
