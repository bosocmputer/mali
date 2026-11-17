import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toTask } from "@/lib/dbMappers";
import {
  getDueDateByTaxTypeFromDb,
  getRuleByTaxFormFromDb,
  getRulePaymentMap,
} from "@/lib/repositories/rules";
import { randomUUID } from "crypto";
import type { PaymentType, Role, Task, TaskStatus, TaskStatusHistoryEntry } from "@/types";
import { applyWorkflowAction, AUDITED_STATEMENT_FORMS, CLOSED_STATUSES, type WorkflowAction, type WorkflowChanges } from "@/lib/taskWorkflow";
import { getLastDayOfMonth } from "@/lib/ruleEngine";
import { getTaskPeriodDateRange } from "@/lib/taskFilters";
import { compareTasksByUrgency } from "@/lib/taskOrder";
import { canAccessTaskWithScope, taskAccessWhere, type LedTeamScope } from "@/lib/taskAccess";
import { startOfTodayUtc } from "@/lib/utils";

const taskInclude = {
  client: {
    include: {
      taxTypes: {
        orderBy: { id: "asc" as const },
      },
    },
  },
  taxType: true,
  assignedUser: true,
};

export class DuplicateTaskError extends Error {}

type DbTaskRow = Parameters<typeof toTask>[0];

/** Map DB rows to tasks, filling `hasPayment` from each task's rule (one rule query per call). */
export async function toTasksWithRules(rows: DbTaskRow[]): Promise<Task[]> {
  if (rows.length === 0) return [];
  const paymentMap = await getRulePaymentMap();
  return rows.map((row) => toTask(row, paymentMap.get(row.taxType.name) ?? true));
}

async function toTaskWithRule(row: DbTaskRow): Promise<Task> {
  return (await toTasksWithRules([row]))[0];
}

/** Teams this user leads and the people in them (empty for anyone who is not a team lead). */
export async function getLedTeamScope(userId: string): Promise<LedTeamScope> {
  const teams = await prisma.team.findMany({
    where: { leadUserId: userId },
    select: { id: true, members: { select: { userId: true } } },
  });
  return {
    teamIds: teams.map((t) => t.id),
    memberIds: Array.from(new Set(teams.flatMap((t) => t.members.map((m) => m.userId)))),
  };
}

/** Whether this user may open and edit the task: supervisors, the assignee, or the team lead. */
export async function canUserAccessTask(
  user: { id: string; role: string },
  task: { assignedUserId: string; client: { teamId?: string | null } }
): Promise<boolean> {
  if (user.role === "SUPERVISOR" || task.assignedUserId === user.id) return true;
  return canAccessTaskWithScope(user, task, await getLedTeamScope(user.id));
}

export async function findTasksFromDb(filters: {
  isSupervisor: boolean;
  userId: string;
  status?: TaskStatus | "OVERDUE" | "AUDITOR_PENDING";
  paymentType?: PaymentType;
  branchCode?: string;
  taxTypeName?: string;
  clientId?: string;
  assignedUserId?: string;
  month?: number;       // fiscalYearEndDate month (1-12)
  year?: number;        // fiscalYearEndDate year
  dueMonth?: number;    // dueDate month (1-12)
  dueYear?: number;     // dueDate year
  due?: string;         // exact dueDate, YYYY-MM-DD
  fiscalYearEndDay?: number;   // client annual close day
  fiscalYearEndMonth?: number; // client annual close month
  search?: string;
}): Promise<Task[]> {
  const where: Prisma.TaskWhereInput = {};

  if (!filters.isSupervisor) {
    where.AND = [taskAccessWhere(filters.userId, await getLedTeamScope(filters.userId))];
  }

  if (filters.status === "AUDITOR_PENDING") {
    // FR-101: annual statements still waiting for the auditor's report
    where.taxType = { name: { in: AUDITED_STATEMENT_FORMS } };
    where.auditorReportAt = null;
    where.status = { not: "NOT_FILING" };
  } else if (filters.status === "OVERDUE") {
    where.status = { notIn: CLOSED_STATUSES };
    // OVERDUE takes full ownership of dueDate — ignore dueMonth/dueYear to avoid conflict
    where.dueDate = { lt: startOfTodayUtc() };
  } else {
    if (filters.status) {
      where.status = filters.status;
    }
    // Exact due date (links from LINE reminders) wins over the month/year filters
    if (filters.due && /^\d{4}-\d{2}-\d{2}$/.test(filters.due)) {
      const start = new Date(filters.due + "T00:00:00.000Z");
      where.dueDate = { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    } else if (filters.dueMonth || filters.dueYear) {
      // Filter by dueDate month/year (only when not OVERDUE)
      where.dueDate = getTaskPeriodDateRange({ month: filters.dueMonth, year: filters.dueYear });
    }
  }

  if (filters.paymentType) {
    where.paymentType = filters.paymentType;
  }

  if (filters.taxTypeName && filters.status !== "AUDITOR_PENDING") {
    where.taxType = { name: filters.taxTypeName };
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.isSupervisor && filters.assignedUserId) {
    where.assignedUserId = filters.assignedUserId;
  }

  if (filters.month || filters.year) {
    where.fiscalYearEndDate = getTaskPeriodDateRange(filters);
  }

  // Filter by client annual fiscal year end (DD/MM) and branch (FR-92)
  if (filters.fiscalYearEndDay || filters.fiscalYearEndMonth || filters.branchCode) {
    where.client = {
      ...(filters.fiscalYearEndDay ? { fiscalYearEndDay: filters.fiscalYearEndDay } : {}),
      ...(filters.fiscalYearEndMonth ? { fiscalYearEnd: filters.fiscalYearEndMonth } : {}),
      ...(filters.branchCode ? { branchCode: filters.branchCode } : {}),
    };
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { client: { companyName: { contains: q, mode: "insensitive" } } },
      { taxType: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
  });

  // `priority` is fixed when a task is generated and never updated, so it cannot rank urgency
  return (await toTasksWithRules(tasks)).sort(compareTasksByUrgency);
}

export async function getTaskByIdFromDb(id: string): Promise<Task | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });
  return task ? toTaskWithRule(task) : null;
}

export async function createTaskInDb(input: {
  clientId: string;
  taxTypeId: string;
  assignedUserId: string;
  fiscalYearEndDate: Date;
}): Promise<Task | null> {
  const [client, taxType, assignedUser] = await Promise.all([
    prisma.client.findUnique({ where: { id: input.clientId } }),
    prisma.taxType.findUnique({ where: { id: input.taxTypeId } }),
    prisma.user.findUnique({ where: { id: input.assignedUserId } }),
  ]);

  if (!client || !taxType || !assignedUser || taxType.clientId !== client.id) {
    return null;
  }

  const dueDate = await getDueDateByTaxTypeFromDb(taxType.name, input.fiscalYearEndDate);
  if (!dueDate) {
    throw new Error(`No rule found for ${taxType.name}`);
  }

  const rule = await getRuleByTaxFormFromDb(taxType.name);
  const ruleUsed = rule
    ? `${rule.ruleCode}: ${taxType.name} — ${rule.name}`
    : taxType.name;

  try {
    const task = await prisma.task.create({
      data: {
        id: `task-${Date.now()}`,
        clientId: client.id,
        taxTypeId: taxType.id,
        assignedUserId: assignedUser.id,
        fiscalYearEndDate: input.fiscalYearEndDate,
        dueDate,
        ruleUsed,
        status: "TODO",
        paymentType: taxType.defaultPaymentType,
        priority: "MEDIUM",
        mddScore: 50,
      },
      include: taskInclude,
    });
    return toTaskWithRule(task);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateTaskError("Task already exists for this client, tax type, and period");
    }
    throw error;
  }
}

/** Note, general evidence and (supervisor) reassignment. Status changes go through applyTaskWorkflowInDb. */
export async function updateTaskInDb(
  id: string,
  input: Partial<{
    note: string;
    evidenceUrls: string[];
    assignedUserId: string;
    penaltyAmount: number | null;
    surchargeAmount: number | null;
    penaltyBorneBy: "CLIENT" | "OFFICE" | null;
    penaltyReason: string | null;
    auditorSentAt: string | null; // YYYY-MM-DD
    auditorReportAt: string | null;
  }>
): Promise<Task | null> {
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;

  const task = await prisma.task.update({
    where: { id },
    data: {
      note: input.note,
      evidenceUrls: input.evidenceUrls,
      assignedUserId: input.assignedUserId,
      penaltyAmount: input.penaltyAmount,
      surchargeAmount: input.surchargeAmount,
      penaltyBorneBy: input.penaltyBorneBy,
      penaltyReason: input.penaltyReason === undefined ? undefined : input.penaltyReason || null,
      auditorSentAt: toDbDate(input.auditorSentAt),
      auditorReportAt: toDbDate(input.auditorReportAt),
    },
    include: taskInclude,
  });

  return toTaskWithRule(task);
}

export class WorkflowError extends Error {
  constructor(message: string, readonly code?: string, readonly status = 400) {
    super(message);
  }
}

const toDbDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(`${value}T00:00:00.000Z`);

function changesToData(changes: WorkflowChanges): Prisma.TaskUpdateManyMutationInput {
  return {
    paymentType: changes.paymentType,
    docsRequestedAt: toDbDate(changes.docsRequestedAt),
    docsReceivedAt: toDbDate(changes.docsReceivedAt),
    filedAt: toDbDate(changes.filedAt),
    taxAmount: changes.taxAmount === undefined ? undefined : changes.taxAmount,
    clientPaidAt: toDbDate(changes.clientPaidAt),
    clientSlipUrls: changes.clientSlipUrls,
    officePaidAt: toDbDate(changes.officePaidAt),
    receiptUrls: changes.receiptUrls,
    notFilingReason: changes.notFilingReason,
    completedAt: changes.completedAt,
  };
}

/**
 * Apply one workflow step (see lib/taskWorkflow.ts) and record it in the status history, in one
 * transaction. The update is conditional on the status the decision was based on, so two people
 * acting on the same task at once can't both win.
 */
export async function applyTaskWorkflowInDb(
  id: string,
  actor: { id: string; role: Role },
  action: WorkflowAction
): Promise<{ task: Task; from: TaskStatus; to: TaskStatus }> {
  const row = await prisma.task.findUnique({
    where: { id },
    select: {
      status: true,
      paymentType: true,
      docsRequestedAt: true,
      taxType: { select: { name: true, frequency: true } },
    },
  });
  if (!row) throw new WorkflowError("Task not found", "NOT_FOUND", 404);

  const hasPayment = (await getRulePaymentMap()).get(row.taxType.name) ?? true;

  let statusBeforeNotFiling: TaskStatus | null = null;
  if (action.type === "REVERT" && row.status === "NOT_FILING") {
    const last = await prisma.taskStatusHistory.findFirst({
      where: { taskId: id, toStatus: "NOT_FILING" },
      orderBy: { changedAt: "desc" },
      select: { fromStatus: true },
    });
    statusBeforeNotFiling = last?.fromStatus ?? null;
  }

  const result = applyWorkflowAction(
    {
      status: row.status,
      paymentType: row.paymentType,
      hasPayment,
      frequency: row.taxType.frequency,
      docsRequestedAt: row.docsRequestedAt ? row.docsRequestedAt.toISOString().slice(0, 10) : null,
    },
    actor,
    action.type === "REVERT" ? { ...action, statusBeforeNotFiling } : action
  );
  if (!result.ok) throw new WorkflowError(result.error, result.code);

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.task.updateMany({
      where: { id, status: row.status },
      data: { ...changesToData(result.changes), status: result.status },
    });
    if (count === 0) {
      throw new WorkflowError("งานนี้ถูกเปลี่ยนสถานะไปแล้ว กรุณาเปิดใหม่อีกครั้ง", "CONFLICT", 409);
    }
    if (result.history.length > 0) {
      const at = Date.now();
      await tx.taskStatusHistory.createMany({
        data: result.history.map((step, index) => ({
          id: randomUUID(),
          taskId: id,
          fromStatus: step.from,
          toStatus: step.to,
          changedById: actor.id,
          // keep FILED → next strictly after the step into FILED
          changedAt: new Date(at + index),
          reason: step.reason ?? null,
        })),
      });
    }
  });

  const task = await getTaskByIdFromDb(id);
  if (!task) throw new WorkflowError("Task not found", "NOT_FOUND", 404);
  return { task, from: row.status, to: result.status };
}

export async function getTaskStatusHistoryFromDb(taskId: string): Promise<TaskStatusHistoryEntry[]> {
  const rows = await prisma.taskStatusHistory.findMany({
    where: { taskId },
    orderBy: { changedAt: "desc" },
    include: { changedBy: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    changedByName: row.changedBy.name,
    changedAt: row.changedAt.toISOString(),
    ...(row.reason ? { reason: row.reason } : {}),
  }));
}

export function getNextFiscalYearEndDate(task: {
  fiscalYearEndDate: string;
  client: { fiscalYearEnd: number; fiscalYearEndDay: number };
}): string {
  const current = new Date(task.fiscalYearEndDate);
  const currentYear = current.getUTCFullYear();
  const endMonth = task.client.fiscalYearEnd;
  const endDay = task.client.fiscalYearEndDay;
  const nextYear = currentYear + 1;
  const lastDay = getLastDayOfMonth(endMonth, nextYear);
  const clampedDay = Math.min(endDay, lastDay.getUTCDate());
  return new Date(Date.UTC(nextYear, endMonth - 1, clampedDay)).toISOString();
}

export async function previewNextCycleFromDb(id: string): Promise<{
  nextFiscalYearEndDate: string;
  nextDueDate: string;
  alreadyExists: boolean;
} | null> {
  const task = await getTaskByIdFromDb(id);
  if (!task) return null;

  const nextFiscalYearEndDate = getNextFiscalYearEndDate(task);
  const nextDueDate = await getDueDateByTaxTypeFromDb(
    task.taxType.name,
    new Date(nextFiscalYearEndDate)
  );
  if (!nextDueDate) {
    throw new Error(`No rule found for ${task.taxType.name}`);
  }

  const existing = await prisma.task.findFirst({
    where: {
      clientId: task.clientId,
      taxTypeId: task.taxTypeId,
      fiscalYearEndDate: new Date(nextFiscalYearEndDate),
    },
    select: { id: true },
  });

  return {
    nextFiscalYearEndDate,
    nextDueDate: nextDueDate.toISOString(),
    alreadyExists: !!existing,
  };
}

export async function createNextCycleTaskFromDb(id: string): Promise<Task | null> {
  const task = await getTaskByIdFromDb(id);
  if (!task) return null;

  const nextFiscalYearEndDate = new Date(getNextFiscalYearEndDate(task));
  const dueDate = await getDueDateByTaxTypeFromDb(task.taxType.name, nextFiscalYearEndDate);
  if (!dueDate) {
    throw new Error(`No rule found for ${task.taxType.name}`);
  }

  const rule = await getRuleByTaxFormFromDb(task.taxType.name);
  const ruleUsed = rule
    ? `${rule.ruleCode}: ${task.taxType.name} — ${rule.name}`
    : task.taxType.name;

  try {
    const newTask = await prisma.task.create({
      data: {
        id: `task-${Date.now()}`,
        clientId: task.clientId,
        taxTypeId: task.taxTypeId,
        assignedUserId: task.assignedUserId,
        fiscalYearEndDate: nextFiscalYearEndDate,
        dueDate,
        ruleUsed,
        status: "TODO",
        paymentType: task.taxType.defaultPaymentType,
        priority: task.priority ?? "MEDIUM",
        mddScore: task.mddScore ?? 50,
      },
      include: taskInclude,
    });
    return toTaskWithRule(newTask);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateTaskError("Task already exists for this client, tax type, and period");
    }
    throw error;
  }
}

export type DeleteTaskResult = "DELETED" | "NOT_FOUND" | "NOT_TODO";

/**
 * Supervisors may delete a task only while it is still TODO (decided with the
 * customer, Nov 2026). The status check is part of the delete itself so a task
 * someone starts at the same moment is never removed. Notification logs go
 * with it (FK cascade).
 */
export async function deleteTodoTaskFromDb(id: string): Promise<DeleteTaskResult> {
  const { count } = await prisma.task.deleteMany({ where: { id, status: "TODO" } });
  if (count > 0) return "DELETED";
  const exists = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  return exists ? "NOT_TODO" : "NOT_FOUND";
}
