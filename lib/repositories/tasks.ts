import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toTask } from "@/lib/dbMappers";
import { getDueDateByTaxTypeFromDb, getRuleByTaxFormFromDb } from "@/lib/repositories/rules";
import type { Task, TaskStatus } from "@/types";
import { getLastDayOfMonth } from "@/lib/ruleEngine";

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

export async function findTasksFromDb(filters: {
  isSupervisor: boolean;
  userId: string;
  status?: TaskStatus | "OVERDUE";
  clientId?: string;
  assignedUserId?: string;
  month?: number;
  year?: number;
  search?: string;
}): Promise<Task[]> {
  const where: Prisma.TaskWhereInput = {};

  if (!filters.isSupervisor) {
    where.assignedUserId = filters.userId;
  }

  if (filters.status === "OVERDUE") {
    where.status = { not: "SUBMITTED" };
    where.dueDate = { lt: new Date() };
  } else if (filters.status) {
    where.status = filters.status;
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.isSupervisor && filters.assignedUserId) {
    where.assignedUserId = filters.assignedUserId;
  }

  if (filters.month || filters.year) {
    const year = filters.year ?? new Date().getFullYear();
    if (filters.month) {
      const start = new Date(Date.UTC(year, filters.month - 1, 1));
      const end =
        filters.month === 12
          ? new Date(Date.UTC(year + 1, 0, 1))
          : new Date(Date.UTC(year, filters.month, 1));
      where.dueDate = { gte: start, lt: end };
    } else {
      where.dueDate = {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      };
    }
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
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });

  return tasks.map(toTask);
}

export async function getTaskByIdFromDb(id: string): Promise<Task | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });
  return task ? toTask(task) : null;
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
        priority: "MEDIUM",
        mddScore: 50,
      },
      include: taskInclude,
    });
    return toTask(task);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateTaskError("Task already exists for this client, tax type, and period");
    }
    throw error;
  }
}

export async function updateTaskInDb(
  id: string,
  input: Partial<{
    status: TaskStatus;
    note: string;
    evidenceUrl: string;
    assignedUserId: string;
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
      status: input.status,
      note: input.note,
      evidenceUrl: input.evidenceUrl,
      assignedUserId: input.assignedUserId,
    },
    include: taskInclude,
  });

  return toTask(task);
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
        priority: task.priority ?? "MEDIUM",
        mddScore: task.mddScore ?? 50,
      },
      include: taskInclude,
    });
    return toTask(newTask);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateTaskError("Task already exists for this client, tax type, and period");
    }
    throw error;
  }
}
