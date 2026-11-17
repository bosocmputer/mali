import { describe, expect, it } from "vitest";
import { applyWorkflowAction, availableActions, type WorkflowTask } from "./taskWorkflow";

import type { WorkflowActor } from "./taskWorkflow";

const staff: WorkflowActor = { role: "STAFF" };
const supervisor: WorkflowActor = { role: "SUPERVISOR" };
const now = new Date("2026-11-17T03:00:00Z");

const task = (over: Partial<WorkflowTask> = {}): WorkflowTask => ({
  status: "TODO",
  paymentType: "CLIENT_PAYS",
  hasPayment: true,
  frequency: "MONTHLY",
  ...over,
});

describe("documents (FR-98)", () => {
  it("TODO → WAITING_DOCS needs the request date", () => {
    expect(applyWorkflowAction(task(), staff, { type: "REQUEST_DOCS", date: "" }).ok).toBe(false);
    const r = applyWorkflowAction(task(), staff, { type: "REQUEST_DOCS", date: "2026-11-10" });
    expect(r).toMatchObject({ ok: true, status: "WAITING_DOCS", changes: { docsRequestedAt: "2026-11-10" } });
  });

  it("WAITING_DOCS → PROCESSING needs the received date; TODO can start directly", () => {
    const waiting = task({ status: "WAITING_DOCS", docsRequestedAt: "2026-11-10" });
    expect(applyWorkflowAction(waiting, staff, { type: "START" }).ok).toBe(false);
    expect(applyWorkflowAction(waiting, staff, { type: "START", docsReceivedAt: "2026-11-12" })).toMatchObject({
      ok: true,
      status: "PROCESSING",
    });
    expect(applyWorkflowAction(task(), staff, { type: "START" })).toMatchObject({ ok: true, status: "PROCESSING" });
  });
});

describe("filing (FR-77, FR-78)", () => {
  const processing = task({ status: "PROCESSING" });

  it("client pays → DONE through FILED, both steps recorded", () => {
    const r = applyWorkflowAction(processing, staff, { type: "FILE", filedAt: "2026-11-14" }, now);
    expect(r).toMatchObject({ ok: true, status: "DONE", changes: { filedAt: "2026-11-14", completedAt: now } });
    if (r.ok) expect(r.history.map((h) => h.to)).toEqual(["FILED", "DONE"]);
  });

  it("filing date is required", () => {
    expect(applyWorkflowAction(processing, staff, { type: "FILE", filedAt: "" }).ok).toBe(false);
  });

  it("office pays needs an amount and goes to AWAITING_CLIENT_PAYMENT", () => {
    const officePays = task({ status: "PROCESSING", paymentType: "OFFICE_PAYS" });
    expect(applyWorkflowAction(officePays, staff, { type: "FILE", filedAt: "2026-11-14" }).ok).toBe(false);
    expect(
      applyWorkflowAction(officePays, staff, { type: "FILE", filedAt: "2026-11-14", taxAmount: 781.23 })
    ).toMatchObject({ ok: true, status: "AWAITING_CLIENT_PAYMENT", changes: { taxAmount: 781.23 } });
  });

  it("office pays with 0 asks to switch payment type", () => {
    const r = applyWorkflowAction(task({ status: "PROCESSING", paymentType: "OFFICE_PAYS" }), staff, {
      type: "FILE",
      filedAt: "2026-11-14",
      taxAmount: 0,
    });
    expect(r).toMatchObject({ ok: false, code: "ZERO_AMOUNT_OFFICE_PAYS" });
  });

  it("payment type chosen in the filing dialog wins over the task's default", () => {
    const r = applyWorkflowAction(task({ status: "PROCESSING", paymentType: "OFFICE_PAYS" }), staff, {
      type: "FILE",
      filedAt: "2026-11-14",
      paymentType: "NO_TAX",
    });
    expect(r).toMatchObject({ ok: true, status: "DONE", changes: { paymentType: "NO_TAX" } });
  });

  it("rules without payment finish on filing and ignore payment fields", () => {
    const r = applyWorkflowAction(task({ status: "TODO", hasPayment: false, paymentType: "OFFICE_PAYS" }), staff, {
      type: "FILE",
      filedAt: "2026-11-14",
    });
    expect(r).toMatchObject({ ok: true, status: "DONE" });
    if (r.ok) expect(r.changes.paymentType).toBeUndefined();
  });

  it("cannot file twice", () => {
    expect(applyWorkflowAction(task({ status: "DONE" }), staff, { type: "FILE", filedAt: "2026-11-14" }).ok).toBe(false);
  });
});

describe("payments (FR-79, FR-81, FR-87)", () => {
  it("client paid needs a date and at least one slip", () => {
    const t = task({ status: "AWAITING_CLIENT_PAYMENT", paymentType: "OFFICE_PAYS" });
    expect(applyWorkflowAction(t, staff, { type: "CLIENT_PAID", date: "2026-11-15", slipUrls: [] }).ok).toBe(false);
    expect(
      applyWorkflowAction(t, staff, { type: "CLIENT_PAID", date: "2026-11-15", slipUrls: ["/uploads/a.pdf"] })
    ).toMatchObject({ ok: true, status: "AWAITING_OFFICE_PAYMENT" });
  });

  it("only supervisors record the office payment, with a receipt", () => {
    const t = task({ status: "AWAITING_OFFICE_PAYMENT", paymentType: "OFFICE_PAYS" });
    const action = { type: "OFFICE_PAID" as const, date: "2026-11-16", receiptUrls: ["/uploads/r.pdf"] };
    expect(applyWorkflowAction(t, staff, action).ok).toBe(false);
    expect(applyWorkflowAction(t, supervisor, { ...action, receiptUrls: [] }).ok).toBe(false);
    expect(applyWorkflowAction(t, supervisor, action, now)).toMatchObject({
      ok: true,
      status: "DONE",
      changes: { completedAt: now },
    });
  });
});

describe("not filing this month (FR-85)", () => {
  it("monthly, before filing, with a reason", () => {
    expect(applyWorkflowAction(task(), staff, { type: "NOT_FILING", reason: "  " }).ok).toBe(false);
    expect(applyWorkflowAction(task({ frequency: "ANNUAL" }), staff, { type: "NOT_FILING", reason: "x" }).ok).toBe(false);
    expect(
      applyWorkflowAction(task({ status: "AWAITING_CLIENT_PAYMENT" }), staff, { type: "NOT_FILING", reason: "x" }).ok
    ).toBe(false);
    expect(
      applyWorkflowAction(task({ status: "WAITING_DOCS" }), staff, { type: "NOT_FILING", reason: "ไม่มีจ่ายเงินได้" })
    ).toMatchObject({ ok: true, status: "NOT_FILING", changes: { notFilingReason: "ไม่มีจ่ายเงินได้" } });
  });
});

describe("going back one step (FR-83)", () => {
  const back = (t: WorkflowTask, actor = staff, before?: WorkflowTask["status"]) =>
    applyWorkflowAction(t, actor, { type: "REVERT", statusBeforeNotFiling: before });

  it("walks back the path", () => {
    expect(back(task({ status: "WAITING_DOCS" }))).toMatchObject({ status: "TODO" });
    expect(back(task({ status: "PROCESSING" }))).toMatchObject({ status: "TODO" });
    expect(back(task({ status: "PROCESSING", docsRequestedAt: "2026-11-01" }))).toMatchObject({ status: "WAITING_DOCS" });
    expect(back(task({ status: "AWAITING_CLIENT_PAYMENT" }))).toMatchObject({ status: "PROCESSING" });
    expect(back(task({ status: "AWAITING_OFFICE_PAYMENT" }))).toMatchObject({ status: "AWAITING_CLIENT_PAYMENT" });
  });

  it("closed tasks reopen only by a supervisor", () => {
    expect(back(task({ status: "DONE" })).ok).toBe(false);
    expect(back(task({ status: "NOT_FILING" })).ok).toBe(false);
    expect(back(task({ status: "DONE", paymentType: "OFFICE_PAYS" }), supervisor)).toMatchObject({
      status: "AWAITING_OFFICE_PAYMENT",
      changes: { completedAt: null },
    });
    expect(back(task({ status: "DONE" }), supervisor)).toMatchObject({ status: "PROCESSING" });
    expect(back(task({ status: "NOT_FILING" }), supervisor, "WAITING_DOCS")).toMatchObject({ status: "WAITING_DOCS" });
    expect(back(task({ status: "NOT_FILING" }), supervisor)).toMatchObject({ status: "TODO" });
  });

  it("TODO has nowhere to go back to", () => {
    expect(back(task()).ok).toBe(false);
  });
});

describe("payment type before filing (FR-76)", () => {
  it("changes only before filing", () => {
    expect(
      applyWorkflowAction(task({ status: "PROCESSING" }), staff, { type: "SET_PAYMENT_TYPE", paymentType: "OFFICE_PAYS" })
    ).toMatchObject({ ok: true, status: "PROCESSING", history: [] });
    expect(
      applyWorkflowAction(task({ status: "DONE" }), staff, { type: "SET_PAYMENT_TYPE", paymentType: "OFFICE_PAYS" }).ok
    ).toBe(false);
  });
});

describe("availableActions", () => {
  it("offers what the person can do", () => {
    expect(availableActions(task(), staff)).toEqual(["START", "REQUEST_DOCS", "FILE", "NOT_FILING", "SET_PAYMENT_TYPE"]);
    expect(availableActions(task({ frequency: "ANNUAL", hasPayment: false }), staff)).toEqual(["START", "REQUEST_DOCS", "FILE"]);
    expect(availableActions(task({ status: "AWAITING_OFFICE_PAYMENT" }), staff)).toEqual(["REVERT"]);
    expect(availableActions(task({ status: "AWAITING_OFFICE_PAYMENT" }), supervisor)).toEqual(["OFFICE_PAID", "REVERT"]);
    expect(availableActions(task({ status: "DONE" }), staff)).toEqual([]);
    expect(availableActions(task({ status: "DONE" }), supervisor)).toEqual(["REVERT"]);
  });
});
