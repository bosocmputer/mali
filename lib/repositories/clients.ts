import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { toClient, toTeam, toUser } from "@/lib/dbMappers";
import { toTasksWithRules } from "@/lib/repositories/tasks";
import { withRuleFrequencies } from "@/lib/repositories/rules";
import { PRE_FILING_STATUSES } from "@/lib/taskWorkflow";
import { clientLabel, HEAD_OFFICE } from "@/lib/clientLabel";
import type { AssignmentHistoryEntry, Client, PaymentType, Task, Team, User } from "@/types";

export class ClientRelationConflictError extends Error {}

const clientInclude = {
  taxTypes: {
    orderBy: { id: "asc" as const },
  },
  createdBy: { select: { name: true } },
  updatedBy: { select: { name: true } },
};

/**
 * FR-68 / answer 8: the company record already using this tax id + branch (if any), for the
 * "already exists" message. The same tax id is fine on a different branch code.
 */
export async function findClientByTaxId(
  taxId: string,
  branchCode: string,
  excludeClientId?: string
): Promise<{ label: string; assignedStaffName: string | null } | null> {
  const found = await prisma.client.findFirst({
    where: { taxId, branchCode, ...(excludeClientId ? { id: { not: excludeClientId } } : {}) },
    select: { companyName: true, branchCode: true, branchName: true, assignedStaff: { select: { name: true } } },
  });
  return found ? { label: clientLabel(found), assignedStaffName: found.assignedStaff?.name ?? null } : null;
}

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

export async function getAllClientsFromDb(): Promise<Client[]> {
  const clients = await prisma.client.findMany({
    include: clientInclude,
    orderBy: { createdAt: "asc" },
  });
  return clients.map(toClient);
}

export async function getClientByIdFromDb(id: string): Promise<Client | null> {
  const client = await prisma.client.findUnique({
    where: { id },
    include: clientInclude,
  });
  return client ? toClient(client) : null;
}

export async function getClientsPageData(): Promise<{
  clients: Client[];
  teams: Team[];
  staffUsers: User[];
  allTasks: Task[];
}> {
  const [clients, teams, users, tasks] = await Promise.all([
    prisma.client.findMany({
      include: clientInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.team.findMany({
      include: { members: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      include: taskInclude,
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return {
    clients: clients.map(toClient),
    teams: teams.map(toTeam),
    staffUsers: users.map((user) => toUser(user)),
    allTasks: await toTasksWithRules(tasks),
  };
}

export async function createClientInDb(input: {
  companyName: string;
  taxId?: string;
  branchCode?: string;
  branchName?: string;
  businessType: string;
  filingMethod?: "PAPER" | "E_FILING";
  fiscalYearStart: number;
  fiscalYearEnd: number;
  fiscalYearEndDay: number;
  teamId?: string;
  assignedStaffId?: string;
  auditorName?: string;
  monthlyFee?: number;
  createdById: string;
  taxTypes: Array<{
    name: string;
    frequency: "MONTHLY" | "ANNUAL" | "ANNUAL_WORKFLOW";
    defaultPaymentType?: PaymentType;
    assignedStaffId?: string;
  }>;
}): Promise<Client> {
  const now = Date.now();
  const taxTypes = await withRuleFrequencies(input.taxTypes);
  const client = await prisma.client.create({
    data: {
      id: `client-${now}`,
      companyName: input.companyName,
      taxId: input.taxId,
      branchCode: input.branchCode ?? HEAD_OFFICE,
      branchName: input.branchName || null,
      businessType: input.businessType,
      filingMethod: input.filingMethod,
      fiscalYearStart: input.fiscalYearStart,
      fiscalYearEnd: input.fiscalYearEnd,
      fiscalYearEndDay: input.fiscalYearEndDay,
      isNonStandard: input.fiscalYearEnd !== 12,
      teamId: input.teamId,
      assignedStaffId: input.assignedStaffId,
      auditorName: input.auditorName || null,
      monthlyFee: input.monthlyFee ?? null,
      createdById: input.createdById,
      updatedById: input.createdById,
      taxTypes: {
        create: taxTypes.map((taxType, index) => ({
          id: `tt-${now}-${index}`,
          name: taxType.name,
          frequency: taxType.frequency,
          defaultPaymentType: taxType.defaultPaymentType,
          assignedStaffId: taxType.assignedStaffId,
        })),
      },
    },
    include: clientInclude,
  });
  return toClient(client);
}

export async function updateClientInDb(
  id: string,
  input: {
    companyName?: string;
    taxId?: string | null;
    branchCode?: string;
    branchName?: string | null;
    businessType?: string;
    filingMethod?: "PAPER" | "E_FILING" | null;
    fiscalYearStart?: number;
    fiscalYearEnd?: number;
    fiscalYearEndDay?: number;
    isNonStandard?: boolean;
    teamId?: string | null;
    assignedStaffId?: string | null;
    auditorName?: string | null;
    monthlyFee?: number | null;
    isActive?: boolean;
    serviceEndDate?: string | null; // YYYY-MM-DD
    taxTypes?: Array<{
      name: string;
      frequency: "MONTHLY" | "ANNUAL" | "ANNUAL_WORKFLOW";
      defaultPaymentType?: PaymentType;
      assignedStaffId?: string | null;
    }>;
  },
  changedById?: string,
  /** staff edits: keep each tax type's responsible person as it is (assignments are supervisor-only) */
  options: { keepAssignments?: boolean } = {}
): Promise<Client | null> {
  const existing = await prisma.client.findUnique({
    where: { id },
    select: { id: true, assignedStaffId: true },
  });
  if (!existing) return null;

  if (input.taxTypes) {
    input = { ...input, taxTypes: await withRuleFrequencies(input.taxTypes) };
  }

  const now = Date.now();
  const updated = await prisma.$transaction(async (tx) => {
    if (input.taxTypes) {
      const existingTaxTypes = await tx.taxType.findMany({
        where: { clientId: id },
        include: { _count: { select: { tasks: true } } },
      });
      const incomingNames = new Set(input.taxTypes.map((taxType) => taxType.name));
      const blockedDeletes = existingTaxTypes.filter(
        (taxType) => !incomingNames.has(taxType.name) && taxType._count.tasks > 0
      );
      if (blockedDeletes.length > 0) {
        throw new ClientRelationConflictError(
          `Cannot remove tax types with existing tasks: ${blockedDeletes
            .map((taxType) => taxType.name)
            .join(", ")}`
        );
      }

      const existingByName = new Map(
        existingTaxTypes.map((taxType) => [taxType.name, taxType])
      );

      for (let index = 0; index < input.taxTypes.length; index++) {
        const taxType = input.taxTypes[index];
        const existingTaxType = existingByName.get(taxType.name);
        if (existingTaxType) {
          const nextAssignedStaffId = options.keepAssignments
            ? existingTaxType.assignedStaffId
            : taxType.assignedStaffId ?? null;
          await tx.taxType.update({
            where: { id: existingTaxType.id },
            data: {
              frequency: taxType.frequency,
              defaultPaymentType: taxType.defaultPaymentType,
              assignedStaffId: nextAssignedStaffId,
            },
          });
          // A new default also applies to this tax type's tasks that haven't been filed yet,
          // so switching a company to "office pays" covers this month's work too.
          if (
            taxType.defaultPaymentType &&
            taxType.defaultPaymentType !== existingTaxType.defaultPaymentType
          ) {
            await tx.task.updateMany({
              where: { taxTypeId: existingTaxType.id, status: { in: PRE_FILING_STATUSES } },
              data: { paymentType: taxType.defaultPaymentType },
            });
          }
          await reassignOnStaffChange(tx, {
            scope: "TAX_TYPE",
            clientId: id,
            taxTypeId: existingTaxType.id,
            fromUserId: existingTaxType.assignedStaffId,
            toUserId: nextAssignedStaffId,
            changedById,
          });
        } else {
          await tx.taxType.create({
            data: {
              id: `tt-${now}-${index}`,
              clientId: id,
              name: taxType.name,
              frequency: taxType.frequency,
              defaultPaymentType: taxType.defaultPaymentType,
              assignedStaffId: options.keepAssignments ? undefined : taxType.assignedStaffId,
            },
          });
        }
      }

      await tx.taxType.deleteMany({
        where: {
          clientId: id,
          name: { notIn: Array.from(incomingNames) },
        },
      });
    }

    await tx.client.update({
      where: { id },
      data: {
        companyName: input.companyName,
        taxId: input.taxId,
        branchCode: input.branchCode,
        branchName: input.branchName === undefined ? undefined : input.branchName || null,
        businessType: input.businessType,
        filingMethod: input.filingMethod,
        fiscalYearStart: input.fiscalYearStart,
        fiscalYearEnd: input.fiscalYearEnd,
        fiscalYearEndDay: input.fiscalYearEndDay,
        isNonStandard: input.isNonStandard,
        teamId: input.teamId,
        assignedStaffId: input.assignedStaffId,
        auditorName: input.auditorName === undefined ? undefined : input.auditorName || null,
        monthlyFee: input.monthlyFee === undefined ? undefined : input.monthlyFee,
        isActive: input.isActive,
        serviceEndDate:
          input.serviceEndDate === undefined
            ? undefined
            : input.serviceEndDate === null
              ? null
              : new Date(`${input.serviceEndDate}T00:00:00.000Z`),
        updatedById: changedById,
      },
    });

    if (input.assignedStaffId !== undefined) {
      await reassignOnStaffChange(tx, {
        scope: "CLIENT",
        clientId: id,
        taxTypeId: null,
        fromUserId: existing.assignedStaffId,
        toUserId: input.assignedStaffId,
        changedById,
      });
    }

    return tx.client.findUniqueOrThrow({
      where: { id },
      include: clientInclude,
    });
  });

  return toClient(updated);
}

/**
 * When a client's or tax type's default assignedStaffId changes, the change only
 * affects future task generation on its own — existing Task rows keep whichever
 * assignedUserId they were created with. Staff handoffs need TODO tasks (not yet
 * started) to move to the new person too, so we reassign those here and record
 * the change in AssignmentHistory. tasks already started are left alone —
 * they're a record of who actually did the work.
 */
async function reassignOnStaffChange(
  tx: Prisma.TransactionClient,
  input: {
    scope: "CLIENT" | "TAX_TYPE";
    clientId: string;
    taxTypeId: string | null;
    fromUserId: string | null;
    toUserId: string | null;
    changedById?: string;
  }
): Promise<void> {
  const { scope, clientId, taxTypeId, fromUserId, toUserId, changedById } = input;
  if (!toUserId || toUserId === fromUserId || !changedById) return;

  await tx.assignmentHistory.create({
    data: {
      id: `ah-${randomUUID()}`,
      scope,
      clientId,
      taxTypeId,
      fromUserId,
      toUserId,
      changedById,
    },
  });

  await tx.task.updateMany({
    where: {
      clientId,
      status: "TODO",
      // A client-level change must not override tax types that have their own assignee.
      ...(taxTypeId ? { taxTypeId } : { taxType: { assignedStaffId: null } }),
    },
    data: { assignedUserId: toUserId },
  });
}

export async function getAssignmentHistoryForClient(
  clientId: string
): Promise<AssignmentHistoryEntry[]> {
  const entries = await prisma.assignmentHistory.findMany({
    where: { clientId },
    include: {
      taxType: { select: { name: true } },
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
      changedBy: { select: { name: true } },
    },
    orderBy: { changedAt: "desc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    scope: entry.scope,
    clientId: entry.clientId,
    taxTypeId: entry.taxTypeId,
    taxTypeName: entry.taxType?.name ?? null,
    fromUserName: entry.fromUser?.name ?? null,
    toUserName: entry.toUser.name,
    changedByName: entry.changedBy.name,
    changedAt: entry.changedAt.toISOString(),
  }));
}

export async function deleteClientInDb(id: string): Promise<boolean> {
  const existing = await prisma.client.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.client.delete({ where: { id } });
  return true;
}

/** Companies someone is responsible for (as the company's person or for one of its tax types). */
export async function listClientsOfStaff(userId: string): Promise<
  { id: string; label: string; openTasks: number; isActive: boolean }[]
> {
  const clients = await prisma.client.findMany({
    where: { OR: [{ assignedStaffId: userId }, { taxTypes: { some: { assignedStaffId: userId } } }] },
    select: {
      id: true,
      companyName: true,
      branchCode: true,
      branchName: true,
      isActive: true,
      _count: { select: { tasks: { where: { assignedUserId: userId, status: { notIn: ["DONE", "NOT_FILING"] } } } } },
    },
    orderBy: { companyName: "asc" },
  });
  return clients.map((c) => ({ id: c.id, label: clientLabel(c), openTasks: c._count.tasks, isActive: c.isActive }));
}

/**
 * FR-104: hand someone's companies over to another person in one go — the company, the tax types
 * assigned to them, and every task of theirs that isn't finished. Each change is recorded in the
 * assignment history. One transaction, so a half-done transfer can't happen.
 */
export async function transferWorkInDb(input: {
  fromUserId: string;
  toUserId: string;
  clientIds: string[];
  changedById: string;
}): Promise<{ clients: number; tasks: number }> {
  const { fromUserId, toUserId, clientIds, changedById } = input;
  return prisma.$transaction(async (tx) => {
    const clients = await tx.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, assignedStaffId: true, taxTypes: { select: { id: true, assignedStaffId: true } } },
    });
    let tasks = 0;
    for (const client of clients) {
      if (client.assignedStaffId === fromUserId) {
        await tx.client.update({ where: { id: client.id }, data: { assignedStaffId: toUserId, updatedById: changedById } });
        await tx.assignmentHistory.create({
          data: { id: `ah-${randomUUID()}`, scope: "CLIENT", clientId: client.id, taxTypeId: null, fromUserId, toUserId, changedById },
        });
      }
      for (const tt of client.taxTypes.filter((t) => t.assignedStaffId === fromUserId)) {
        await tx.taxType.update({ where: { id: tt.id }, data: { assignedStaffId: toUserId } });
        await tx.assignmentHistory.create({
          data: { id: `ah-${randomUUID()}`, scope: "TAX_TYPE", clientId: client.id, taxTypeId: tt.id, fromUserId, toUserId, changedById },
        });
      }
      const moved = await tx.task.updateMany({
        where: { clientId: client.id, assignedUserId: fromUserId, status: { notIn: ["DONE", "NOT_FILING"] } },
        data: { assignedUserId: toUserId },
      });
      tasks += moved.count;
    }
    return { clients: clients.length, tasks };
  });
}
