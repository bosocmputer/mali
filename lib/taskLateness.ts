import type { PaymentType } from "@/types";

/** FR-102: filed or paid after the due date (calendar days, dates as YYYY-MM-DD or ISO). */
type LateInput = {
  dueDate: string;
  filedAt?: string | null;
  officePaidAt?: string | null;
  paymentType: PaymentType;
  hasPayment: boolean;
};

const day = (d: string) => d.slice(0, 10);

export function lateness(t: LateInput): { lateFiling: boolean; latePayment: boolean; late: boolean } {
  const due = day(t.dueDate);
  const lateFiling = !!t.filedAt && day(t.filedAt) > due;
  const latePayment =
    t.hasPayment && t.paymentType === "OFFICE_PAYS" && !!t.officePaidAt && day(t.officePaidAt) > due;
  return { lateFiling, latePayment, late: lateFiling || latePayment };
}
