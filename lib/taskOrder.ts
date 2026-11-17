import type { Task } from "@/types";
import { isClosedStatus } from "@/lib/taskWorkflow";

/**
 * Default order for task lists: unfinished work first, oldest due date first (so overdue tasks sit
 * on top, then today, then upcoming), and closed tasks (done / not filing) last, most recently due first.
 * Ties fall back to company then tax type so the order is stable between loads.
 */
export function compareTasksByUrgency(
  a: Pick<Task, "status" | "dueDate" | "client" | "taxType">,
  b: Pick<Task, "status" | "dueDate" | "client" | "taxType">
): number {
  const aDone = isClosedStatus(a.status);
  const bDone = isClosedStatus(b.status);
  if (aDone !== bDone) return aDone ? 1 : -1;

  const byDue = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  if (byDue !== 0) return aDone ? -byDue : byDue;

  return (
    a.client.companyName.localeCompare(b.client.companyName, "th") ||
    a.taxType.name.localeCompare(b.taxType.name, "th")
  );
}
