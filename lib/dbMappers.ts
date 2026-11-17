import type {
  Client,
  FilingMethod,
  Frequency,
  PaymentType,
  Role,
  Rule,
  Task,
  TaskPriority,
  TaskStatus,
  ThaiHoliday,
  TaxType,
  Team,
  User,
} from "@/types";

type DbUser = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  isActive: boolean;
  lineUserId: string | null;
  createdAt: Date;
};

type DbTeam = {
  id: string;
  name: string;
  leadUserId: string;
  createdAt: Date;
  members?: Array<{ userId: string }>;
};

type DbTaxType = {
  id: string;
  name: string;
  frequency: string;
  clientId: string;
  assignedStaffId: string | null;
  defaultPaymentType?: string;
};

type DbClient = {
  id: string;
  companyName: string;
  taxId: string | null;
  businessType: string;
  fiscalYearStart: number;
  fiscalYearEnd: number;
  fiscalYearEndDay: number;
  isNonStandard: boolean;
  filingMethod: string | null;
  assignedStaffId: string | null;
  teamId: string | null;
  createdAt: Date;
  taxTypes?: DbTaxType[];
};

type DbTask = {
  id: string;
  clientId: string;
  client: DbClient;
  taxTypeId: string;
  taxType: DbTaxType;
  assignedUserId: string;
  assignedUser: DbUser;
  fiscalYearEndDate: Date;
  dueDate: Date;
  ruleUsed: string | null;
  status: string;
  priority: string | null;
  mddScore: number | null;
  evidenceUrls: string[];
  note: string | null;
  paymentType: string;
  docsRequestedAt: Date | null;
  docsReceivedAt: Date | null;
  filedAt: Date | null;
  taxAmount: { toString(): string } | number | null;
  clientPaidAt: Date | null;
  clientSlipUrls: string[];
  officePaidAt: Date | null;
  receiptUrls: string[];
  notFilingReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type DbRule = {
  id: string;
  ruleCode: string;
  name: string;
  description: string | null;
  taxForm: string | null;
  calcMethod: string;
  fixedDay: number | null;
  offset: number | null;
  referenceDate: string;
  legalRef: string;
  updatedAt: Date | null;
  daysOffset: number | null;
  taxTypeName: string | null;
  hasPayment: boolean;
};

type DbThaiHoliday = {
  id: string;
  date: Date;
  nameTh: string;
  nameEn: string;
  type: string;
  isSubstitution: boolean;
  note: string | null;
};

export function toUser(user: DbUser, options?: { includePassword?: boolean }): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: options?.includePassword ? user.password ?? "" : "",
    role: user.role as Role,
    isActive: user.isActive,
    ...(user.lineUserId ? { lineUserId: user.lineUserId } : {}),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toTeam(team: DbTeam): Team {
  return {
    id: team.id,
    name: team.name,
    leadUserId: team.leadUserId,
    memberIds: team.members?.map((member) => member.userId) ?? [],
    createdAt: team.createdAt.toISOString(),
  };
}

export function toTaxType(taxType: DbTaxType): TaxType {
  return {
    id: taxType.id,
    name: taxType.name,
    frequency: taxType.frequency as Frequency,
    clientId: taxType.clientId,
    defaultPaymentType: (taxType.defaultPaymentType ?? "CLIENT_PAYS") as PaymentType,
    ...(taxType.assignedStaffId
      ? { assignedStaffId: taxType.assignedStaffId }
      : {}),
  };
}

export function toClient(client: DbClient): Client {
  return {
    id: client.id,
    companyName: client.companyName,
    ...(client.taxId ? { taxId: client.taxId } : {}),
    businessType: client.businessType,
    fiscalYearStart: client.fiscalYearStart,
    fiscalYearEnd: client.fiscalYearEnd,
    fiscalYearEndDay: client.fiscalYearEndDay,
    isNonStandard: client.isNonStandard,
    ...(client.filingMethod
      ? { filingMethod: client.filingMethod as FilingMethod }
      : {}),
    taxTypes: client.taxTypes?.map(toTaxType) ?? [],
    ...(client.assignedStaffId ? { assignedStaffId: client.assignedStaffId } : {}),
    ...(client.teamId ? { teamId: client.teamId } : {}),
    createdAt: client.createdAt.toISOString(),
  };
}

/** DATE column → "YYYY-MM-DD" */
const toDateOnly = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined);

/**
 * `hasPayment` comes from the tax type's rule (not stored on the task); callers look it up with
 * getRulePaymentMap. Tasks whose form has no rule are treated as having a payment.
 */
export function toTask(task: DbTask, hasPayment = true): Task {
  const client = toClient({ ...task.client, taxTypes: task.client.taxTypes ?? [] });
  const taxType = toTaxType(task.taxType);
  return {
    id: task.id,
    clientId: task.clientId,
    client,
    taxTypeId: task.taxTypeId,
    taxType,
    assignedUserId: task.assignedUserId,
    assignedUser: toUser(task.assignedUser),
    fiscalYearEndDate: task.fiscalYearEndDate.toISOString(),
    dueDate: task.dueDate.toISOString(),
    ...(task.ruleUsed ? { ruleUsed: task.ruleUsed } : {}),
    status: task.status as TaskStatus,
    ...(task.priority ? { priority: task.priority as TaskPriority } : {}),
    ...(task.mddScore !== null ? { mddScore: task.mddScore } : {}),
    evidenceUrls: task.evidenceUrls ?? [],
    ...(task.note ? { note: task.note } : {}),
    hasPayment,
    paymentType: task.paymentType as PaymentType,
    ...(task.docsRequestedAt ? { docsRequestedAt: toDateOnly(task.docsRequestedAt) } : {}),
    ...(task.docsReceivedAt ? { docsReceivedAt: toDateOnly(task.docsReceivedAt) } : {}),
    ...(task.filedAt ? { filedAt: toDateOnly(task.filedAt) } : {}),
    ...(task.taxAmount !== null ? { taxAmount: Number(task.taxAmount.toString()) } : {}),
    ...(task.clientPaidAt ? { clientPaidAt: toDateOnly(task.clientPaidAt) } : {}),
    clientSlipUrls: task.clientSlipUrls ?? [],
    ...(task.officePaidAt ? { officePaidAt: toDateOnly(task.officePaidAt) } : {}),
    receiptUrls: task.receiptUrls ?? [],
    ...(task.notFilingReason ? { notFilingReason: task.notFilingReason } : {}),
    ...(task.completedAt ? { completedAt: task.completedAt.toISOString() } : {}),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toRule(rule: DbRule): Rule {
  return {
    id: rule.id,
    ruleCode: rule.ruleCode,
    name: rule.name,
    ...(rule.description ? { description: rule.description } : {}),
    ...(rule.taxForm ? { taxForm: rule.taxForm } : {}),
    calcMethod: rule.calcMethod as Rule["calcMethod"],
    ...(rule.fixedDay !== null ? { fixedDay: rule.fixedDay } : {}),
    ...(rule.offset !== null ? { offset: rule.offset } : {}),
    referenceDate: rule.referenceDate as Rule["referenceDate"],
    legalRef: rule.legalRef,
    hasPayment: rule.hasPayment,
    ...(rule.updatedAt ? { updatedAt: rule.updatedAt.toISOString() } : {}),
    ...(rule.daysOffset !== null ? { daysOffset: rule.daysOffset } : {}),
    ...(rule.taxTypeName ? { taxTypeName: rule.taxTypeName } : {}),
  };
}

export function toThaiHoliday(holiday: DbThaiHoliday): ThaiHoliday {
  return {
    id: holiday.id,
    date: holiday.date.toISOString().slice(0, 10),
    name_th: holiday.nameTh,
    name_en: holiday.nameEn,
    type: holiday.type as ThaiHoliday["type"],
    is_substitution: holiday.isSubstitution,
    note: holiday.note,
  };
}
