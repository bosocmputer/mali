import { DefaultSession } from "next-auth";

// ─── Enums ───────────────────────────────────────────────────────────────────

export type Role = "STAFF" | "SUPERVISOR";
export type Frequency = "MONTHLY" | "ANNUAL" | "ANNUAL_WORKFLOW";
export type TaskStatus = "TODO" | "PROCESSING" | "SUBMITTED";
export type NotificationType = "REMINDER" | "ESCALATION" | "MANUAL";
export type FilingMethod = "PAPER" | "E_FILING";
export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type TaxFormName =
  | "ภ.ง.ด.1"
  | "ภ.ง.ด.3"
  | "ภ.ง.ด.53"
  | "ภ.ง.ด.50"
  | "ภ.ง.ด.51"
  | "ภ.พ.30"
  | "ภ.พ.36"
  | "ส.บช.3"
  | "บอจ.5"
  | "ประกันสังคม"
  | "AGM"
  | "จัดทำงบ (ร่าง)"
  | "ผู้สอบบัญชี";

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  lineUserId?: string;
  createdAt: string;
}

export interface TaxType {
  id: string;
  name: string; // e.g. "ภ.ง.ด.50"
  frequency: Frequency;
  clientId: string;
  assignedStaffId?: string;
}

export interface Rule {
  id: string;
  ruleCode: string;
  name: string;
  description?: string;
  taxForm?: string;
  calcMethod: "fixed_day" | "offset_days" | "offset_months";
  fixedDay?: number;
  offset?: number;
  referenceDate: "month_end" | "fiscal_year_end" | "agm_date";
  legalRef: string;
  updatedAt?: string;
  /** @deprecated use offset with calcMethod instead */
  daysOffset?: number;
  /** @deprecated use taxForm instead */
  taxTypeName?: string;
}

export interface Client {
  id: string;
  companyName: string;
  taxId?: string; // เลขนิติบุคคล 13 หลัก
  businessType: string;
  fiscalYearStart: number; // 1–12
  fiscalYearEnd: number; // 1–12
  fiscalYearEndDay: number; // 1–31, วันที่สิ้นสุดรอบบัญชี (ค่าเริ่มต้น = last day of fiscalYearEnd)
  isNonStandard: boolean;
  filingMethod?: FilingMethod;
  taxTypes: TaxType[];
  assignedStaffId?: string;
  teamId?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  clientId: string;
  client: Client;
  taxTypeId: string;
  taxType: TaxType;
  assignedUserId: string;
  assignedUser: User;
  fiscalYearEndDate: string; // ISO date string
  dueDate: string; // ISO date string
  ruleUsed?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  mddScore?: number;
  evidenceUrl?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  taskId: string;
  userId: string;
  type: NotificationType;
  sentAt: string;
}

export interface Team {
  id: string;
  name: string;
  leadUserId: string;
  memberIds: string[];
  createdAt: string;
}

export type HolidayType = "public_holiday" | "special_holiday" | "government_holiday" | "substitution_holiday";

export interface ThaiHoliday {
  id: string;
  date: string; // "YYYY-MM-DD"
  name_th: string;
  name_en: string;
  type: HolidayType;
  is_substitution: boolean;
  note?: string | null;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── Dashboard / UI Shapes ───────────────────────────────────────────────────

export interface DashboardStats {
  totalTasks: number;
  overdueTasks: number;
  submittedTasks: number;
  processingTasks: number;
  todoTasks: number;
}

export interface WorkloadData {
  name: string;
  todo: number;
  processing: number;
  submitted: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  clientId?: string;
  assignedUserId?: string;
  month?: number;
  year?: number;
  search?: string;
}

// ─── NextAuth Module Augmentation ────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role: Role;
      id: string;
    };
  }
  interface User {
    role: Role;
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    id: string;
  }
}
