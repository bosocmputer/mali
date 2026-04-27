import { getHolidayDates } from "@/data/mockData";

export function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
}

export function isThaiHoliday(date: Date): boolean {
  const key = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
  return getHolidayDates().has(key);
}

/**
 * Shift date forward past weekends and Thai public holidays.
 * Loops until it lands on a working day.
 */
export function adjustDueDate(date: Date): Date {
  let d = new Date(date);
  while (isWeekend(d) || isThaiHoliday(d)) {
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  }
  return d;
}
