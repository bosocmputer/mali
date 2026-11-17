import type { Task } from "@/types";
import { clientLabel } from "@/lib/clientLabel";
import { isClosedStatus, STATUS_LABEL } from "@/lib/taskWorkflow";
import { lateness } from "@/lib/taskLateness";

/** Inclusive date range, YYYY-MM-DD. */
export type Range = { from: string; to: string };
const inRange = (date: string | undefined, r: Range) => !!date && date.slice(0, 10) >= r.from && date.slice(0, 10) <= r.to;
const sum = (xs: (number | undefined)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);

/** FR-99: money the office pays on clients' behalf, for tasks filed in the range. */
export function paymentsReport(tasks: Task[], r: Range) {
  const rows = tasks
    .filter((t) => t.hasPayment && t.paymentType === "OFFICE_PAYS" && inRange(t.filedAt, r))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((t) => ({
      company: clientLabel(t.client),
      taxType: t.taxType.name,
      period: t.fiscalYearEndDate.slice(0, 7),
      amount: t.taxAmount ?? 0,
      dueDate: t.dueDate.slice(0, 10),
      filedAt: t.filedAt ?? "",
      clientPaidAt: t.clientPaidAt ?? "",
      officePaidAt: t.officePaidAt ?? "",
      status: STATUS_LABEL[t.status],
      assignee: t.assignedUser.name,
      _status: t.status,
    }));
  return {
    rows,
    summary: {
      awaitingClient: sum(rows.filter((x) => x._status === "AWAITING_CLIENT_PAYMENT").map((x) => x.amount)),
      receivedNotPaid: sum(rows.filter((x) => x._status === "AWAITING_OFFICE_PAYMENT").map((x) => x.amount)),
      paid: sum(rows.filter((x) => x._status === "DONE").map((x) => x.amount)),
    },
  };
}

/** FR-102: late filing/payment with penalties, for tasks due in the range, plus a per-company summary. */
export function lateReport(tasks: Task[], r: Range) {
  const rows = tasks
    .filter((t) => inRange(t.dueDate, r))
    .map((t) => ({ t, l: lateness(t) }))
    .filter(({ t, l }) => l.late || t.penaltyAmount !== undefined || t.surchargeAmount !== undefined)
    .sort((a, b) => a.t.dueDate.localeCompare(b.t.dueDate))
    .map(({ t, l }) => ({
      company: clientLabel(t.client),
      taxType: t.taxType.name,
      period: t.fiscalYearEndDate.slice(0, 7),
      dueDate: t.dueDate.slice(0, 10),
      filedAt: t.filedAt ?? "",
      officePaidAt: t.officePaidAt ?? "",
      kind: [l.lateFiling && "ยื่นล่าช้า", l.latePayment && "ชำระล่าช้า"].filter(Boolean).join(", "),
      penalty: t.penaltyAmount ?? 0,
      surcharge: t.surchargeAmount ?? 0,
      borneBy: t.penaltyBorneBy === "CLIENT" ? "ลูกค้า" : t.penaltyBorneBy === "OFFICE" ? "สำนักงาน" : "",
      reason: t.penaltyReason ?? "",
      assignee: t.assignedUser.name,
    }));
  const byCompany = new Map<string, { company: string; count: number; penalty: number; surcharge: number; officeBorne: number }>();
  for (const x of rows) {
    const c = byCompany.get(x.company) ?? { company: x.company, count: 0, penalty: 0, surcharge: 0, officeBorne: 0 };
    c.count++;
    c.penalty += x.penalty;
    c.surcharge += x.surcharge;
    if (x.borneBy === "สำนักงาน") c.officeBorne += x.penalty + x.surcharge;
    byCompany.set(x.company, c);
  }
  return { rows, byCompany: Array.from(byCompany.values()).sort((a, b) => b.count - a.count) };
}

/** FR-108: per person, tasks due in the range (NOT_FILING left out), and what is open right now. */
export function performanceReport(tasks: Task[], r: Range, now = new Date()) {
  const people = new Map<string, { name: string; total: number; done: number; onTime: number; late: number; openNow: number; overdueNow: number }>();
  const today = now.toISOString().slice(0, 10);
  const get = (t: Task) => {
    const p = people.get(t.assignedUserId) ?? { name: t.assignedUser.name, total: 0, done: 0, onTime: 0, late: 0, openNow: 0, overdueNow: 0 };
    people.set(t.assignedUserId, p);
    return p;
  };
  for (const t of tasks) {
    if (!isClosedStatus(t.status)) {
      const p = get(t);
      p.openNow++;
      if (t.dueDate.slice(0, 10) < today) p.overdueNow++;
    }
    if (t.status === "NOT_FILING" || !inRange(t.dueDate, r)) continue;
    const p = get(t);
    p.total++;
    const l = lateness(t);
    if (l.late) p.late++;
    if (t.status === "DONE") {
      p.done++;
      if (!l.late) p.onTime++;
    }
  }
  return Array.from(people.values())
    .map((p) => ({ ...p, onTimePct: p.total ? Math.round((p.onTime / p.total) * 1000) / 10 : 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}
