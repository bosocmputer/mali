import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  MOCK_CLIENTS,
  MOCK_NOTIFICATIONS,
  MOCK_RULES,
  MOCK_TASKS,
  MOCK_USERS,
  getAllHolidays,
  getAllTeams,
} from "../data/mockData";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  await prisma.$transaction([
    prisma.notificationLog.deleteMany(),
    prisma.task.deleteMany(),
    prisma.taxType.deleteMany(),
    prisma.client.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.team.deleteMany(),
    prisma.thaiHoliday.deleteMany(),
    prisma.rule.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await prisma.user.createMany({
    data: MOCK_USERS.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      isActive: user.isActive,
      lineUserId: user.lineUserId ?? null,
      createdAt: toDate(user.createdAt),
    })),
  });

  await prisma.rule.createMany({
    data: MOCK_RULES.map((rule) => ({
      id: rule.id,
      ruleCode: rule.ruleCode,
      name: rule.name,
      description: rule.description ?? null,
      taxForm: rule.taxForm ?? null,
      calcMethod: rule.calcMethod,
      fixedDay: rule.fixedDay ?? null,
      offset: rule.offset ?? null,
      referenceDate: rule.referenceDate,
      legalRef: rule.legalRef,
      updatedAt: rule.updatedAt ? toDate(rule.updatedAt) : null,
      daysOffset: rule.daysOffset ?? null,
      taxTypeName: rule.taxTypeName ?? null,
    })),
  });

  for (const team of getAllTeams()) {
    await prisma.team.create({
      data: {
        id: team.id,
        name: team.name,
        leadUserId: team.leadUserId,
        createdAt: toDate(team.createdAt),
        members: {
          create: team.memberIds.map((userId) => ({ userId })),
        },
      },
    });
  }

  for (const client of MOCK_CLIENTS) {
    await prisma.client.create({
      data: {
        id: client.id,
        companyName: client.companyName,
        taxId: client.taxId ?? null,
        businessType: client.businessType,
        fiscalYearStart: client.fiscalYearStart,
        fiscalYearEnd: client.fiscalYearEnd,
        fiscalYearEndDay: client.fiscalYearEndDay,
        isNonStandard: client.isNonStandard,
        filingMethod: client.filingMethod ?? null,
        assignedStaffId: client.assignedStaffId ?? null,
        teamId: client.teamId ?? null,
        createdAt: toDate(client.createdAt),
        taxTypes: {
          create: client.taxTypes.map((taxType) => ({
            id: taxType.id,
            name: taxType.name,
            frequency: taxType.frequency,
            assignedStaffId: taxType.assignedStaffId ?? null,
          })),
        },
      },
    });
  }

  const seededTaskIds = new Set<string>();
  const seededTaskKeys = new Set<string>();
  for (const task of MOCK_TASKS) {
    const taskKey = [
      task.clientId,
      task.taxTypeId,
      task.fiscalYearEndDate.slice(0, 10),
    ].join("|");
    if (seededTaskKeys.has(taskKey)) {
      console.warn(`Skipping duplicate task seed ${task.id} (${taskKey})`);
      continue;
    }

    await prisma.task.create({
      data: {
        id: task.id,
        clientId: task.clientId,
        taxTypeId: task.taxTypeId,
        assignedUserId: task.assignedUserId,
        fiscalYearEndDate: toDate(task.fiscalYearEndDate),
        dueDate: toDate(task.dueDate),
        ruleUsed: task.ruleUsed ?? null,
        status: task.status,
        priority: task.priority ?? null,
        mddScore: task.mddScore ?? null,
        evidenceUrl: task.evidenceUrl ?? null,
        note: task.note ?? null,
        createdAt: toDate(task.createdAt),
        updatedAt: toDate(task.updatedAt),
      },
    });
    seededTaskIds.add(task.id);
    seededTaskKeys.add(taskKey);
  }

  await prisma.thaiHoliday.createMany({
    data: getAllHolidays().map((holiday) => ({
      id: holiday.id,
      date: toDateOnly(holiday.date),
      nameTh: holiday.name_th,
      nameEn: holiday.name_en,
      type: holiday.type,
      isSubstitution: holiday.is_substitution,
      note: holiday.note ?? null,
    })),
  });

  await prisma.notificationLog.createMany({
    data: MOCK_NOTIFICATIONS.filter((notification) =>
      seededTaskIds.has(notification.taskId)
    ).map((notification) => ({
      id: notification.id,
      taskId: notification.taskId,
      userId: notification.userId,
      type: notification.type,
      sentAt: toDate(notification.sentAt),
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
