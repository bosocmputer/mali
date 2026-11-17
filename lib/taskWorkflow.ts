/**
 * Task workflow (Update 2, FR-75–85, 87, 98) — the single place that decides which status change is
 * allowed, who may make it, and what has to be filled in. Pure: the API applies the result, the UI
 * uses `availableActions` to show only buttons that will work.
 *
 *   TODO ──► WAITING_DOCS ──► PROCESSING ──► FILED ─┬─► DONE                      (client pays / nothing to pay / no-payment rule)
 *     └───────────────────────►┘                    └─► AWAITING_CLIENT_PAYMENT ──► AWAITING_OFFICE_PAYMENT ──► DONE
 *   TODO / WAITING_DOCS / PROCESSING ──► NOT_FILING (monthly tasks only, with a reason)
 *
 * FILED is passed through, never rested in: filing moves straight on (FR-78) but both steps are
 * written to the status history.
 */
import type { Frequency, PaymentType, Role, TaskStatus } from "@/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "รอดำเนินการ",
  WAITING_DOCS: "รอเอกสารจากลูกค้า",
  PROCESSING: "กำลังจัดทำ",
  FILED: "ยื่นแบบแล้ว",
  AWAITING_CLIENT_PAYMENT: "รอลูกค้าชำระ",
  AWAITING_OFFICE_PAYMENT: "รอหัวหน้าชำระ",
  DONE: "เสร็จสิ้น",
  NOT_FILING: "ไม่ยื่นเดือนนี้",
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  CLIENT_PAYS: "ลูกค้าชำระเอง",
  OFFICE_PAYS: "สำนักงานชำระแทน",
  // merged into NO_TAX at the customer's request; kept so old rows still read
  NO_ADDITIONAL: "ไม่มีภาษีต้องชำระ",
  NO_TAX: "ไม่มีภาษีต้องชำระ",
};

export const ALL_STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[];
export const ALL_PAYMENT_TYPES = Object.keys(PAYMENT_TYPE_LABEL) as PaymentType[];
/** What people choose from (customer: "ไม่ต้องชำระเพิ่ม" and "ไม่มีภาษีต้องชำระ" are one thing). */
export const SELECTABLE_PAYMENT_TYPES: PaymentType[] = ["CLIENT_PAYS", "OFFICE_PAYS", "NO_TAX"];

/** Closed tasks: no reminders, never overdue. */
export const CLOSED_STATUSES: TaskStatus[] = ["DONE", "NOT_FILING"];
export const isClosedStatus = (status: TaskStatus) => CLOSED_STATUSES.includes(status);

/** Started but not closed: everything between "รอดำเนินการ" and "เสร็จสิ้น". */
export const isInProgressStatus = (status: TaskStatus) => status !== "TODO" && !isClosedStatus(status);

/** Before filing: payment type can still change, "not filing" is still possible. */
export const PRE_FILING_STATUSES: TaskStatus[] = ["TODO", "WAITING_DOCS", "PROCESSING"];
const isPreFiling = (status: TaskStatus) => PRE_FILING_STATUSES.includes(status);

export const MAX_PAYMENT_FILES = 10;

/** FR-101: forms that carry the auditor steps (annual financial statements to DBD). */
export const AUDITED_STATEMENT_FORMS = ["ส.บช.3"];

export interface WorkflowTask {
  status: TaskStatus;
  paymentType: PaymentType;
  hasPayment: boolean;
  frequency: Frequency;
  docsRequestedAt?: string | null;
}

export interface WorkflowActor {
  role: Role;
}

export type WorkflowAction =
  | { type: "REQUEST_DOCS"; date: string }
  | { type: "START"; docsReceivedAt?: string }
  | { type: "FILE"; filedAt: string; paymentType?: PaymentType; taxAmount?: number | null; paymentQrUrls?: string[] }
  | { type: "CLIENT_PAID"; date: string; slipUrls: string[] }
  | { type: "OFFICE_PAID"; date: string; receiptUrls: string[] }
  | { type: "NOT_FILING"; reason: string }
  | { type: "REVERT"; statusBeforeNotFiling?: TaskStatus | null }
  | { type: "SET_PAYMENT_TYPE"; paymentType: PaymentType };

export type WorkflowActionType = WorkflowAction["type"];

/** Fields to write. `null` clears a field; dates are YYYY-MM-DD. */
export interface WorkflowChanges {
  paymentType?: PaymentType;
  docsRequestedAt?: string | null;
  docsReceivedAt?: string | null;
  filedAt?: string | null;
  taxAmount?: number | null;
  clientPaidAt?: string | null;
  clientSlipUrls?: string[];
  officePaidAt?: string | null;
  receiptUrls?: string[];
  paymentQrUrls?: string[];
  notFilingReason?: string | null;
  completedAt?: Date | null;
}

export type WorkflowResult =
  | {
      ok: true;
      status: TaskStatus;
      changes: WorkflowChanges;
      /** status steps to record, oldest first (empty when only data changed) */
      history: { from: TaskStatus; to: TaskStatus; reason?: string }[];
    }
  | { ok: false; error: string; code?: "ZERO_AMOUNT_OFFICE_PAYS" };

const fail = (error: string, code?: "ZERO_AMOUNT_OFFICE_PAYS"): WorkflowResult => ({
  ok: false,
  error,
  ...(code ? { code } : {}),
});

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const isAmount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const validFiles = (urls: unknown): urls is string[] =>
  Array.isArray(urls) &&
  urls.length > 0 &&
  urls.length <= MAX_PAYMENT_FILES &&
  urls.every((u) => typeof u === "string" && u.length > 0);

/** Where one step back leads (FR-83). */
function revertTarget(
  task: WorkflowTask,
  statusBeforeNotFiling?: TaskStatus | null
): { status: TaskStatus; changes: WorkflowChanges } | null {
  switch (task.status) {
    case "WAITING_DOCS":
      return { status: "TODO", changes: { docsRequestedAt: null } };
    case "PROCESSING":
    case "FILED":
      return task.docsRequestedAt
        ? { status: "WAITING_DOCS", changes: { docsReceivedAt: null } }
        : { status: "TODO", changes: {} };
    case "AWAITING_CLIENT_PAYMENT":
      return { status: "PROCESSING", changes: { filedAt: null } };
    case "AWAITING_OFFICE_PAYMENT":
      return { status: "AWAITING_CLIENT_PAYMENT", changes: { clientPaidAt: null } };
    case "DONE":
      return task.hasPayment && task.paymentType === "OFFICE_PAYS"
        ? { status: "AWAITING_OFFICE_PAYMENT", changes: { officePaidAt: null, completedAt: null } }
        : { status: "PROCESSING", changes: { filedAt: null, completedAt: null } };
    case "NOT_FILING": {
      const back =
        statusBeforeNotFiling && isPreFiling(statusBeforeNotFiling) ? statusBeforeNotFiling : "TODO";
      return { status: back, changes: { notFilingReason: null } };
    }
    default:
      return null;
  }
}

/** Only supervisors may reopen closed tasks (FR-83, FR-85). */
const SUPERVISOR_ONLY_REVERT: TaskStatus[] = ["DONE", "NOT_FILING"];

export function applyWorkflowAction(
  task: WorkflowTask,
  actor: WorkflowActor,
  action: WorkflowAction,
  now: Date = new Date()
): WorkflowResult {
  const from = task.status;
  const isSupervisor = actor.role === "SUPERVISOR";

  switch (action.type) {
    case "REQUEST_DOCS": {
      if (from !== "TODO") return fail("ขอเอกสารได้เฉพาะงานที่รอดำเนินการ");
      if (!isDate(action.date)) return fail("กรุณาระบุวันที่ขอเอกสาร");
      return {
        ok: true,
        status: "WAITING_DOCS",
        changes: { docsRequestedAt: action.date },
        history: [{ from, to: "WAITING_DOCS" }],
      };
    }

    case "START": {
      if (from === "TODO") {
        return { ok: true, status: "PROCESSING", changes: {}, history: [{ from, to: "PROCESSING" }] };
      }
      if (from === "WAITING_DOCS") {
        if (!isDate(action.docsReceivedAt)) return fail("กรุณาระบุวันที่ได้รับเอกสาร");
        return {
          ok: true,
          status: "PROCESSING",
          changes: { docsReceivedAt: action.docsReceivedAt },
          history: [{ from, to: "PROCESSING" }],
        };
      }
      return fail("เริ่มจัดทำได้เฉพาะงานที่รอดำเนินการหรือรอเอกสาร");
    }

    case "FILE": {
      if (!isPreFiling(from)) return fail("งานนี้ยื่นแบบไปแล้ว");
      if (!isDate(action.filedAt)) return fail("กรุณาระบุวันที่ยื่นแบบ");

      if (!task.hasPayment) {
        return {
          ok: true,
          status: "DONE",
          changes: { filedAt: action.filedAt, completedAt: now },
          history: [
            { from, to: "FILED" },
            { from: "FILED", to: "DONE" },
          ],
        };
      }

      const paymentType = action.paymentType ?? task.paymentType;
      const amount = action.taxAmount ?? null;
      if (amount !== null && !isAmount(amount)) return fail("ยอดภาษีไม่ถูกต้อง");

      if (paymentType === "OFFICE_PAYS") {
        if (amount === null) return fail("กรุณาระบุยอดภาษีที่ต้องชำระ");
        if (amount === 0) {
          return fail("ยอดภาษีเป็น 0 — เปลี่ยนประเภทการชำระเป็น “ไม่มีภาษีต้องชำระ”", "ZERO_AMOUNT_OFFICE_PAYS");
        }
        // The supervisor pays from this (customer feedback): required
        if (!validFiles(action.paymentQrUrls)) return fail("กรุณาแนบ QR หรือใบแจ้งชำระภาษี ให้หัวหน้าใช้ชำระ");
        return {
          ok: true,
          status: "AWAITING_CLIENT_PAYMENT",
          changes: { paymentType, filedAt: action.filedAt, taxAmount: amount, paymentQrUrls: action.paymentQrUrls },
          history: [
            { from, to: "FILED" },
            { from: "FILED", to: "AWAITING_CLIENT_PAYMENT" },
          ],
        };
      }

      return {
        ok: true,
        status: "DONE",
        changes: { paymentType, filedAt: action.filedAt, taxAmount: amount, completedAt: now },
        history: [
          { from, to: "FILED" },
          { from: "FILED", to: "DONE" },
        ],
      };
    }

    case "CLIENT_PAID": {
      if (from !== "AWAITING_CLIENT_PAYMENT") return fail("งานนี้ไม่ได้อยู่ในสถานะรอลูกค้าชำระ");
      if (!isDate(action.date)) return fail("กรุณาระบุวันที่รับเงินจากลูกค้า");
      if (!validFiles(action.slipUrls)) return fail("กรุณาแนบสลิปโอนเงินจากลูกค้าอย่างน้อย 1 ไฟล์");
      return {
        ok: true,
        status: "AWAITING_OFFICE_PAYMENT",
        changes: { clientPaidAt: action.date, clientSlipUrls: action.slipUrls },
        history: [{ from, to: "AWAITING_OFFICE_PAYMENT" }],
      };
    }

    case "OFFICE_PAID": {
      if (!isSupervisor) return fail("เฉพาะผู้จัดการเท่านั้นที่บันทึกการชำระได้");
      if (from !== "AWAITING_OFFICE_PAYMENT") return fail("งานนี้ไม่ได้อยู่ในสถานะรอหัวหน้าชำระ");
      if (!isDate(action.date)) return fail("กรุณาระบุวันที่ชำระ");
      if (!validFiles(action.receiptUrls)) return fail("กรุณาแนบใบเสร็จรับเงินอย่างน้อย 1 ไฟล์");
      return {
        ok: true,
        status: "DONE",
        changes: { officePaidAt: action.date, receiptUrls: action.receiptUrls, completedAt: now },
        history: [{ from, to: "DONE" }],
      };
    }

    case "NOT_FILING": {
      if (task.frequency !== "MONTHLY") return fail("“ไม่ยื่นเดือนนี้” ใช้ได้เฉพาะงานรายเดือน");
      if (!isPreFiling(from)) return fail("เลือก “ไม่ยื่นเดือนนี้” ได้เฉพาะงานที่ยังไม่ยื่นแบบ");
      const reason = action.reason?.trim();
      if (!reason) return fail("กรุณาระบุเหตุผลที่ไม่ยื่น");
      return {
        ok: true,
        status: "NOT_FILING",
        changes: { notFilingReason: reason },
        history: [{ from, to: "NOT_FILING", reason }],
      };
    }

    case "REVERT": {
      if (SUPERVISOR_ONLY_REVERT.includes(from) && !isSupervisor) {
        return fail("งานที่ปิดแล้วย้อนสถานะได้เฉพาะผู้จัดการ");
      }
      const target = revertTarget(task, action.statusBeforeNotFiling);
      if (!target) return fail("ย้อนสถานะไม่ได้");
      return { ok: true, status: target.status, changes: target.changes, history: [{ from, to: target.status }] };
    }

    case "SET_PAYMENT_TYPE": {
      if (!isPreFiling(from)) return fail("เปลี่ยนประเภทการชำระได้เฉพาะก่อนยื่นแบบ");
      if (!(action.paymentType in PAYMENT_TYPE_LABEL)) return fail("ประเภทการชำระไม่ถูกต้อง");
      return { ok: true, status: from, changes: { paymentType: action.paymentType }, history: [] };
    }
  }
}

/** Actions worth offering for this task and person (the server still validates the details). */
export function availableActions(task: WorkflowTask, actor: WorkflowActor): WorkflowActionType[] {
  const isSupervisor = actor.role === "SUPERVISOR";
  const actions: WorkflowActionType[] = [];
  switch (task.status) {
    case "TODO":
      actions.push("START", "REQUEST_DOCS", "FILE");
      break;
    case "WAITING_DOCS":
      actions.push("START", "FILE");
      break;
    case "PROCESSING":
      actions.push("FILE");
      break;
    case "AWAITING_CLIENT_PAYMENT":
      actions.push("CLIENT_PAID");
      break;
    case "AWAITING_OFFICE_PAYMENT":
      if (isSupervisor) actions.push("OFFICE_PAID");
      break;
  }
  if (task.frequency === "MONTHLY" && isPreFiling(task.status)) actions.push("NOT_FILING");
  if (isPreFiling(task.status) && task.hasPayment) actions.push("SET_PAYMENT_TYPE");
  if (task.status !== "TODO" && (isSupervisor || !SUPERVISOR_ONLY_REVERT.includes(task.status))) {
    actions.push("REVERT");
  }
  return actions;
}
