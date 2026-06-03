import { prisma } from "@/lib/db";
import { toClient, toTask, toTeam, toUser } from "@/lib/dbMappers";
import type { Client, Task, Team, User } from "@/types";

export class ClientRelationConflictError extends Error {}

const clientInclude = {
  taxTypes: {
    orderBy: { id: "asc" as const },
  },
};

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
    allTasks: tasks.map(toTask),
  };
}

export async function createClientInDb(input: {
  companyName: string;
  taxId?: string;
  businessType: string;
  filingMethod?: "PAPER" | "E_FILING";
  fiscalYearStart: number;
  fiscalYearEnd: number;
  fiscalYearEndDay: number;
  teamId?: string;
  assignedStaffId?: string;
  taxTypes: Array<{
    name: string;
    frequency: "MONTHLY" | "ANNUAL" | "ANNUAL_WORKFLOW";
    assignedStaffId?: string;
  }>;
}): Promise<Client> {
  const now = Date.now();
  const client = await prisma.client.create({
    data: {
      id: `client-${now}`,
      companyName: input.companyName,
      taxId: input.taxId,
      businessType: input.businessType,
      filingMethod: input.filingMethod,
      fiscalYearStart: input.fiscalYearStart,
      fiscalYearEnd: input.fiscalYearEnd,
      fiscalYearEndDay: input.fiscalYearEndDay,
      isNonStandard: input.fiscalYearEnd !== 12,
      teamId: input.teamId,
      assignedStaffId: input.assignedStaffId,
      taxTypes: {
        create: input.taxTypes.map((taxType, index) => ({
          id: `tt-${now}-${index}`,
          name: taxType.name,
          frequency: taxType.frequency,
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
    businessType?: string;
    filingMethod?: "PAPER" | "E_FILING" | null;
    fiscalYearStart?: number;
    fiscalYearEnd?: number;
    fiscalYearEndDay?: number;
    isNonStandard?: boolean;
    teamId?: string | null;
    assignedStaffId?: string | null;
    taxTypes?: Array<{
      name: string;
      frequency: "MONTHLY" | "ANNUAL" | "ANNUAL_WORKFLOW";
      assignedStaffId?: string;
    }>;
  }
): Promise<Client | null> {
  const existing = await prisma.client.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return null;

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
          await tx.taxType.update({
            where: { id: existingTaxType.id },
            data: {
              frequency: taxType.frequency,
              assignedStaffId: taxType.assignedStaffId ?? null,
            },
          });
        } else {
          await tx.taxType.create({
            data: {
              id: `tt-${now}-${index}`,
              clientId: id,
              name: taxType.name,
              frequency: taxType.frequency,
              assignedStaffId: taxType.assignedStaffId,
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
        businessType: input.businessType,
        filingMethod: input.filingMethod,
        fiscalYearStart: input.fiscalYearStart,
        fiscalYearEnd: input.fiscalYearEnd,
        fiscalYearEndDay: input.fiscalYearEndDay,
        isNonStandard: input.isNonStandard,
        teamId: input.teamId,
        assignedStaffId: input.assignedStaffId,
      },
    });

    return tx.client.findUniqueOrThrow({
      where: { id },
      include: clientInclude,
    });
  });

  return toClient(updated);
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
