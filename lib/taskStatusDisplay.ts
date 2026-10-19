import type { TaskStatus } from "@/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "รอดำเนินการ",
  PROCESSING: "กำลังดำเนินการ",
  SUBMITTED: "ยื่นแล้ว",
};

/**
 * What the status badge shows. The label is always the real workflow status; being overdue is a
 * separate fact (a task can be overdue while still waiting, or while in progress) and is flagged
 * with `late`, never by replacing the label — replacing it made "start work" look like it had
 * turned the task into "overdue" and hid whether work had begun.
 */
export function taskStatusDisplay(
  status: TaskStatus,
  isOverdue: boolean
): { label: string; late: boolean } {
  return { label: STATUS_LABEL[status], late: isOverdue && status !== "SUBMITTED" };
}
