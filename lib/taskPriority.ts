import { daysUntil } from "@/lib/utils";
import type { TaskStatus } from "@/types";

export type LivePriority = "OVERDUE" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export const LIVE_PRIORITY_LABEL: Record<LivePriority, string> = {
  OVERDUE: "เกินกำหนด",
  CRITICAL: "ด่วนมาก",
  HIGH: "สูง",
  MEDIUM: "กลาง",
  LOW: "ต่ำ",
};

/**
 * Urgency of a task as of today. The stored `Task.priority` is computed once when the task is
 * generated and never updated, so it drifts out of date (overdue tasks stayed "low", submitted and
 * due-today tasks stayed "critical"); anything shown to users should use this instead.
 * Returns null for submitted tasks, which have no urgency.
 */
export function getLivePriority(
  task: { status: TaskStatus; dueDate: Date | string },
  now: Date = new Date()
): LivePriority | null {
  if (task.status === "SUBMITTED") return null;
  const days = daysUntil(task.dueDate, now);
  if (days < 0) return "OVERDUE";
  if (days <= 3) return "CRITICAL";
  if (days <= 7) return "HIGH";
  if (days <= 14) return "MEDIUM";
  return "LOW";
}
