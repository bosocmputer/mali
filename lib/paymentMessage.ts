import type { PaymentType } from "@/types";

/**
 * Answer 16: one message per company per month, copied into the client's LINE group.
 * Built from the month's payable tasks plus the monthly accounting fee. Lines follow the
 * examples the office already sends; the text stays editable before copying.
 */
export interface PaymentMessageItem {
  taxType: string;
  /** undefined = not filed yet, amount unknown */
  amount?: number;
  paymentType: PaymentType;
}

export interface PaymentMessageInput {
  companyLabel: string;
  period: string; // YYYY-MM
  fee?: number;
  items: PaymentMessageItem[];
  dueDate?: string; // YYYY-MM-DD
  bank: { bankName: string; accountNo: string; accountName: string };
  closing?: string;
  particle: string; // ครับ / ค่ะ
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export const baht = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "10/69" for 2026-10 */
const shortPeriod = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return `${String(m).padStart(2, "0")}/${String((y + 543) % 100).padStart(2, "0")}`;
};

/** "15/11/69" */
const shortDate = (date: string) => {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String((y + 543) % 100).padStart(2, "0")}`;
};

/** Amount the client transfers to the office: the fee plus office-pays taxes. */
export function officeTotal(input: Pick<PaymentMessageInput, "fee" | "items">): number {
  return (input.fee ?? 0) + input.items.filter((i) => i.paymentType === "OFFICE_PAYS").reduce((s, i) => s + (i.amount ?? 0), 0);
}

export function buildPaymentMessage(input: PaymentMessageInput): string {
  const [y, m] = input.period.split("-").map(Number);
  const p = input.particle;
  const sp = shortPeriod(input.period);
  const account = `${input.bank.accountName} ${input.bank.accountNo} ${input.bank.bankName}`.trim();
  const lines: string[] = [];

  lines.push(`สวัสดี${p}`);
  lines.push(`ขออนุญาตนำส่งรายการตั้งเบิก ประจำเดือน ${THAI_MONTHS[m - 1]} ${y + 543}`);
  lines.push(`ของ ${input.companyLabel}`);

  const total = officeTotal(input);
  if (total > 0) {
    lines.push("");
    lines.push(`ยอดรวมโอนเข้าบัญชีสำนักงาน ${baht(total)} บาท`);
    lines.push(`(โอนให้บัญชี ${account})`);
  }

  let n = 0;
  if (input.fee && input.fee > 0) {
    lines.push("");
    lines.push(`${++n}.ค่าบริการทำบัญชี ประจำเดือน ${sp}`);
    lines.push(`ยอดเงิน ${baht(input.fee)} บาท`);
  }
  for (const item of input.items) {
    lines.push("");
    lines.push(`${++n}.${item.taxType} ประจำเดือน ${sp}`);
    if (item.paymentType === "NO_TAX" || item.paymentType === "NO_ADDITIONAL" || item.amount === 0) {
      lines.push(`ไม่มียอดชำระ${p}`);
    } else if (item.amount === undefined) {
      lines.push("ยอดเงิน — (ยังไม่ได้ยื่นแบบ)");
    } else if (item.paymentType === "OFFICE_PAYS") {
      lines.push(`ยอดเงิน ${baht(item.amount)} บาท (โอนเข้าบัญชีสำนักงาน)`);
    } else {
      lines.push(`เสียภาษี ${baht(item.amount)} บาท (โอนให้สรรพากรโดยตรง)`);
    }
  }

  lines.push("");
  if (input.dueDate) lines.push(`กำหนดชำระ ${shortDate(input.dueDate)} ${p}`);
  // Typed in full by the office, including ครับ/ค่ะ (customer feedback)
  if (input.closing) lines.push(input.closing);
  lines.push(`ขอบคุณ${p}`);
  return lines.join("\n");
}
