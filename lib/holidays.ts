export function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
}

/**
 * Legacy sync fallback. Production DB flows use adjustDueDateFromDb from
 * lib/repositories/holidays so edited holidays are applied.
 */
export function isThaiHoliday(_date: Date): boolean {
  void _date;
  return false;
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
