/** Base URL of the MALI web app as users reach it (VPN-only, so it is the internal address). */
export function getAppBaseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "").trim().replace(/\/+$/, "");
}

export function appUrl(path: string, base: string = getAppBaseUrl()): string | undefined {
  if (!base) return undefined;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Opens the task's detail dialog on the tasks page. */
export function taskLink(taskId: string, base?: string): string | undefined {
  return appUrl(`/tasks?taskId=${encodeURIComponent(taskId)}`, base);
}

/**
 * List that reproduces what a reminder was about: overdue tasks when there is no days-left
 * (escalation of everything overdue), otherwise the tasks due on that single date.
 */
export function reminderListLink(
  daysLeft: number | undefined,
  dueDate: Date,
  base?: string
): string | undefined {
  if (daysLeft === undefined) return appUrl("/tasks?status=OVERDUE", base);
  return appUrl(`/tasks?due=${dueDate.toISOString().slice(0, 10)}`, base);
}
