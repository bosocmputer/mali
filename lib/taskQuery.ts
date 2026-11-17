import type { PaymentType, TaskStatus } from "@/types";
import { ALL_PAYMENT_TYPES, ALL_STATUSES } from "@/lib/taskWorkflow";
import type { findTasksFromDb } from "@/lib/repositories/tasks";

type TaskQuery = Parameters<typeof findTasksFromDb>[0];

/** Task-list filters from a URL — shared by the task list and its Excel export (FR-103). */
export function parseTaskQuery(sp: URLSearchParams, user: { id: string; role: string }): TaskQuery {
  const statusParam = sp.get("status");
  // Unknown values (e.g. "SUBMITTED" in links made before Update 2) are ignored instead of crashing
  const status: TaskQuery["status"] =
    statusParam === "OVERDUE" || statusParam === "AUDITOR_PENDING" || ALL_STATUSES.includes(statusParam as TaskStatus)
      ? (statusParam as TaskQuery["status"])
      : statusParam === "SUBMITTED"
        ? "DONE"
        : undefined;
  const branchParam = sp.get("branchCode");
  const paymentTypeParam = sp.get("paymentType");
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);

  let fiscalYearEndDay: number | undefined;
  let fiscalYearEndMonth: number | undefined;
  const fiscalYearEnd = sp.get("fiscalYearEnd"); // "DD/MM"
  if (fiscalYearEnd && /^\d{2}\/\d{2}$/.test(fiscalYearEnd)) {
    [fiscalYearEndDay, fiscalYearEndMonth] = fiscalYearEnd.split("/").map(Number);
  }

  return {
    isSupervisor: user.role === "SUPERVISOR",
    userId: user.id,
    status,
    paymentType: ALL_PAYMENT_TYPES.includes(paymentTypeParam as PaymentType) ? (paymentTypeParam as PaymentType) : undefined,
    branchCode: branchParam && /^\d{5}$/.test(branchParam) ? branchParam : undefined,
    taxTypeName: sp.get("taxType") || undefined,
    clientId: sp.get("clientId") ?? undefined,
    assignedUserId: sp.get("assignedUserId") ?? undefined,
    month: num("month"),
    year: num("year"),
    dueMonth: num("dueMonth"),
    dueYear: num("dueYear"),
    due: sp.get("due") ?? undefined,
    fiscalYearEndDay,
    fiscalYearEndMonth,
    search: sp.get("search") ?? undefined,
  };
}
