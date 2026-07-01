export interface TaskPeriodFilter {
  month?: number;
  year?: number;
}

export interface DateRange {
  gte: Date;
  lt: Date;
}

export function getTaskPeriodDateRange(
  filters: TaskPeriodFilter,
  now = new Date()
): DateRange | undefined {
  if (!filters.month && !filters.year) return undefined;

  const year = filters.year ?? now.getUTCFullYear();

  if (filters.month) {
    const start = new Date(Date.UTC(year, filters.month - 1, 1));
    const end =
      filters.month === 12
        ? new Date(Date.UTC(year + 1, 0, 1))
        : new Date(Date.UTC(year, filters.month, 1));
    return { gte: start, lt: end };
  }

  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}
