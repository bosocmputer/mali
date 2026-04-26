import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TaskStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date in Thai format: DD/MM/YYYY (Buddhist Era year = Gregorian + 543)
 */
export function formatThaiDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

/**
 * Returns number of days remaining until due date (negative = overdue)
 */
export function daysUntil(dueDate: Date | string): number {
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: Date | string, status: TaskStatus): boolean {
  return status !== "SUBMITTED" && daysUntil(dueDate) < 0;
}

export function formatDaysRemaining(dueDate: Date | string, status: TaskStatus): string {
  if (status === "SUBMITTED") return "ยื่นแล้ว";
  const days = daysUntil(dueDate);
  if (days < 0) return `เกินกำหนด ${Math.abs(days)} วัน`;
  if (days === 0) return "ครบกำหนดวันนี้";
  return `อีก ${days} วัน`;
}

export const MONTH_NAMES_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const MONTH_NAMES_SHORT_TH = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const DAY_NAMES_SHORT_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export const TAX_TYPE_OPTIONS = [
  // ก. ภาษีรายเดือน
  { value: "ภ.ง.ด.1",       label: "ภ.ง.ด.1 — หัก ณ ที่จ่าย (เงินเดือน)",        frequency: "MONTHLY" as const },
  { value: "ภ.ง.ด.3",       label: "ภ.ง.ด.3 — หัก ณ ที่จ่าย (บุคคลธรรมดา)",     frequency: "MONTHLY" as const },
  { value: "ภ.ง.ด.53",      label: "ภ.ง.ด.53 — หัก ณ ที่จ่าย (นิติบุคคล)",      frequency: "MONTHLY" as const },
  { value: "ภ.พ.30",        label: "ภ.พ.30 — VAT ปกติ",                           frequency: "MONTHLY" as const },
  { value: "ภ.พ.36",        label: "ภ.พ.36 — VAT นำเข้าบริการ",                   frequency: "MONTHLY" as const },
  { value: "ประกันสังคม",    label: "ประกันสังคม — เงินสมทบ",                       frequency: "MONTHLY" as const },
  // ข. ภาษีรายปี
  { value: "ภ.ง.ด.50",      label: "ภ.ง.ด.50 — CIT รายปี",                       frequency: "ANNUAL" as const },
  { value: "ภ.ง.ด.51",      label: "ภ.ง.ด.51 — CIT ครึ่งปี",                     frequency: "ANNUAL" as const },
  // ค. Workflow ปิดงบประจำปี
  { value: "AGM",            label: "AGM — ประชุมผู้ถือหุ้น",                      frequency: "ANNUAL" as const },
  { value: "ส.บช.3",        label: "ส.บช.3 — นำส่งงบ DBD (+5 เดือน)",             frequency: "ANNUAL" as const },
  { value: "บอจ.5",         label: "บอจ.5 — บัญชีรายชื่อผู้ถือหุ้น",              frequency: "ANNUAL" as const },
  { value: "จัดทำงบ",        label: "จัดทำงบ — ร่างงบการเงิน (+2 เดือน)",          frequency: "ANNUAL" as const },
  { value: "ผู้สอบบัญชี",   label: "ผู้สอบบัญชี — รับรองงบ (+3 เดือน)",           frequency: "ANNUAL" as const },
  { value: "อนุมัติงบ",      label: "อนุมัติงบ — AGM อนุมัติ (+4 เดือน)",         frequency: "ANNUAL" as const },
];

export const BUSINESS_TYPE_OPTIONS = [
  "การค้า",
  "อุตสาหกรรม",
  "เทคโนโลยี",
  "โลจิสติกส์",
  "อาหารและเครื่องดื่ม",
  "บริการ",
  "อสังหาริมทรัพย์",
  "เกษตรกรรม",
  "การเงินและการธนาคาร",
  "อื่นๆ",
];
