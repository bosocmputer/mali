import { describe, expect, it } from "vitest";
import { lateReport, paymentsReport, performanceReport } from "./reports";
import type { Task } from "@/types";

const t = (over: Partial<Task>): Task =>
  ({
    id: Math.random().toString(),
    clientId: "c",
    client: { companyName: "บจก.เอ", branchCode: "00000" },
    taxTypeId: "tt",
    taxType: { name: "ภ.ง.ด.3" },
    assignedUserId: "u1",
    assignedUser: { name: "Nes" },
    fiscalYearEndDate: "2026-10-31T00:00:00.000Z",
    dueDate: "2026-11-15T00:00:00.000Z",
    status: "TODO",
    hasPayment: true,
    paymentType: "OFFICE_PAYS",
    clientSlipUrls: [],
    receiptUrls: [],
    createdAt: "",
    updatedAt: "",
    ...over,
  }) as Task;

const nov = { from: "2026-11-01", to: "2026-11-30" };

describe("paymentsReport (FR-99)", () => {
  it("sums the three buckets for office-pays tasks filed in range", () => {
    const r = paymentsReport(
      [
        t({ status: "AWAITING_CLIENT_PAYMENT", filedAt: "2026-11-05", taxAmount: 100 }),
        t({ status: "AWAITING_OFFICE_PAYMENT", filedAt: "2026-11-06", taxAmount: 200 }),
        t({ status: "DONE", filedAt: "2026-11-07", taxAmount: 300 }),
        t({ status: "DONE", filedAt: "2026-10-07", taxAmount: 999 }),
        t({ status: "DONE", filedAt: "2026-11-07", taxAmount: 999, paymentType: "CLIENT_PAYS" }),
      ],
      nov
    );
    expect(r.rows).toHaveLength(3);
    expect(r.summary).toEqual({ awaitingClient: 100, receivedNotPaid: 200, paid: 300 });
  });
});

describe("lateReport (FR-102)", () => {
  it("lists late tasks and totals per company", () => {
    const r = lateReport(
      [
        t({ filedAt: "2026-11-20", penaltyAmount: 200, surchargeAmount: 50, penaltyBorneBy: "OFFICE" }),
        t({ filedAt: "2026-11-10" }),
      ],
      nov
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].kind).toBe("ยื่นล่าช้า");
    expect(r.byCompany[0]).toMatchObject({ count: 1, penalty: 200, surcharge: 50, officeBorne: 250 });
  });
});

describe("performanceReport (FR-108)", () => {
  it("counts done, on time, late, and open now", () => {
    const r = performanceReport(
      [
        t({ status: "DONE", filedAt: "2026-11-10", paymentType: "CLIENT_PAYS" }),
        t({ status: "DONE", filedAt: "2026-11-20", paymentType: "CLIENT_PAYS" }),
        t({ status: "TODO", dueDate: "2026-11-01T00:00:00.000Z" }),
        t({ status: "NOT_FILING" }),
      ],
      nov,
      new Date("2026-11-17T00:00:00Z")
    );
    expect(r[0]).toMatchObject({ name: "Nes", total: 3, done: 2, onTime: 1, late: 1, openNow: 1, overdueNow: 1, onTimePct: 33.3 });
  });
});
