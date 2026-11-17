import { describe, expect, it } from "vitest";
import { buildPaymentMessage, officeTotal } from "./paymentMessage";
import { lateness } from "./taskLateness";

const bank = { bankName: "ธนาคารกรุงศรี", accountNo: "7181299230", accountName: "บจก.แฮช-แท็คซ์" };

describe("buildPaymentMessage", () => {
  it("follows the office's format: fee, office-pays total, items, due date, particle", () => {
    const text = buildPaymentMessage({
      companyLabel: "บจก.เฮลท์ตี้โซน",
      period: "2026-10",
      fee: 3640,
      items: [
        { taxType: "ภ.ง.ด.3", amount: 2820, paymentType: "OFFICE_PAYS" },
        { taxType: "ประกันสังคม", amount: 5900, paymentType: "OFFICE_PAYS" },
        { taxType: "ภ.พ.30", amount: 0, paymentType: "NO_TAX" },
        { taxType: "ภ.ง.ด.53", amount: 781.23, paymentType: "CLIENT_PAYS" },
      ],
      dueDate: "2026-11-15",
      bank,
      closing: "ถ้าชำระมาแล้วรบกวนส่งสลิปในกลุ่มให้ด้วยนะ",
      particle: "ค่ะ",
    });
    expect(text).toContain("สวัสดีค่ะ");
    expect(text).toContain("ประจำเดือน ตุลาคม 2569");
    expect(text).toContain("ยอดรวมโอนเข้าบัญชีสำนักงาน 12,360.00 บาท");
    expect(text).toContain("1.ค่าบริการทำบัญชี ประจำเดือน 10/69");
    expect(text).toContain("ไม่มียอดชำระค่ะ");
    expect(text).toContain("เสียภาษี 781.23 บาท (โอนให้สรรพากรโดยตรง)");
    expect(text).toContain("กำหนดชำระ 15/11/69 ค่ะ");
    expect(text.trim().endsWith("ขอบคุณค่ะ")).toBe(true);
  });

  it("totals only what goes to the office", () => {
    expect(officeTotal({ fee: 100, items: [{ taxType: "a", amount: 50, paymentType: "CLIENT_PAYS" }] })).toBe(100);
  });

  it("marks items not filed yet", () => {
    const text = buildPaymentMessage({ companyLabel: "x", period: "2026-10", items: [{ taxType: "ภ.ง.ด.1", paymentType: "CLIENT_PAYS" }], bank, particle: "ครับ" });
    expect(text).toContain("ยังไม่ได้ยื่นแบบ");
    expect(text).not.toContain("ยอดรวม");
  });
});

describe("lateness (FR-102)", () => {
  const base = { dueDate: "2026-11-15T00:00:00.000Z", paymentType: "OFFICE_PAYS" as const, hasPayment: true };
  it("late filing / payment compare calendar days", () => {
    expect(lateness({ ...base, filedAt: "2026-11-15" }).late).toBe(false);
    expect(lateness({ ...base, filedAt: "2026-11-16" }).lateFiling).toBe(true);
    expect(lateness({ ...base, filedAt: "2026-11-10", officePaidAt: "2026-11-17" }).latePayment).toBe(true);
    expect(lateness({ ...base, paymentType: "CLIENT_PAYS", filedAt: "2026-11-10", officePaidAt: "2026-11-17" }).late).toBe(false);
  });
});
