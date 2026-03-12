import { DefaultSession } from "next-auth";

// ─── Enums ───────────────────────────────────────────────────────────────────

export type Role = "STAFF" | "SUPERVISOR";
export type Frequency = "MONTHLY" | "ANNUAL";
export type TaskStatus = "TODO" | "PROCESSING" | "SUBMITTED";
export type NotificationType = "REMINDER" | "ESCALATION" | "MANUAL";

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
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  daysOffset: number;
  taxTypeName: string; // link by name for mock
}

export interface Client {
  id: string;
  companyName: string;
  businessType: string;
  fiscalYearStart: number; // 1–12
  fiscalYearEnd: number; // 1–12
  isNonStandard: boolean;
  taxTypes: TaxType[];
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
