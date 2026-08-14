import { randomUUID } from "crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  getAllClientsFromDb,
  getClientByIdFromDb,
} from "@/lib/repositories/clients";
import {
  getDueDateByTaxTypeFromDb,
  getRuleByTaxFormFromDb,
} from "@/lib/repositories/rules";
import { getLastDayOfMonth } from "@/lib/ruleEngine";
import { getNextFiscalYearEndDate, monthlyBackfillBaseDates } from "@/lib/taskGenerationUtils";
import type { Client, TaskPriority } from "@/types";

export { buildGenerationMessage, getNextFiscalYearEndDate, monthlyBackfillBaseDates } from "@/lib/taskGenerationUtils";

function calcPriority(dueDate: Date, now: Date): TaskPriority {
  const daysLeft = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 3)  return "CRITICAL";
  if (daysLeft <= 7)  return "HIGH";
  if (daysLeft <= 14) return "MEDIUM";
  return "LOW";
}

export interface GeneratedTaskCandidate {
  clientId: string;
  clientName: string;
  taxTypeId: string;
  taxTypeName: string;
  assignedUserId: string;
  fiscalYearEndDate: string;
  dueDate: string;
  ruleUsed: string;
}

export interface GenerateResult {
  created: number;
  skipped: number;
  wouldCreate: number;
  dryRun: boolean;
  runId?: string;
  candidates: GeneratedTaskCandidate[];
  errors: string[];
}

export interface GenerateOptions {
  defaultAssignedUserId?: string;
  dryRun?: boolean;
  recordRun?: boolean;
  triggeredBy?: string;
  now?: Date;
  /** Backfill: for MONTHLY tax types with no existing task yet, generate every
   * month starting from this date through the current month, instead of just
   * the next upcoming period. Ignored for a taxType that already has a task. */
  backfillFrom?: Date;
}

type NormalizedGenerateOptions = Required<
  Pick<GenerateOptions, "dryRun" | "recordRun">
> &
  Pick<GenerateOptions, "defaultAssignedUserId" | "triggeredBy" | "now" | "backfillFrom">;

function normalizeOptions(
  input?: string | GenerateOptions
): NormalizedGenerateOptions {
  if (typeof input === "string") {
    return {
      defaultAssignedUserId: input,
      dryRun: false,
      recordRun: true,
      now: new Date(),
    };
  }

  return {
    defaultAssignedUserId: input?.defaultAssignedUserId,
    dryRun: input?.dryRun ?? false,
    recordRun: input?.recordRun ?? true,
    triggeredBy: input?.triggeredBy,
    now: input?.now ?? new Date(),
    backfillFrom: input?.backfillFrom,
  };
}

function emptyResult(dryRun: boolean): GenerateResult {
  return {
    created: 0,
    skipped: 0,
    wouldCreate: 0,
    dryRun,
    candidates: [],
    errors: [],
  };
}

async function getNextMonthlyBaseDate(
  clientId: string,
  taxTypeId: string,
  now: Date
): Promise<Date> {
  const latestTask = await prisma.task.findFirst({
    where: { clientId, taxTypeId },
    orderBy: { fiscalYearEndDate: "desc" },
    select: { fiscalYearEndDate: true },
  });

  if (latestTask) {
    const lastBase = latestTask.fiscalYearEndDate;
    const year = lastBase.getUTCFullYear();
    const month = lastBase.getUTCMonth() + 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return getLastDayOfMonth(nextMonth, nextYear);
  }

  return getLastDayOfMonth(now.getUTCMonth() + 1, now.getUTCFullYear());
}

async function startGenerationRun(input: {
  scope: "ALL" | "CLIENT";
  clientId?: string;
  dryRun: boolean;
  triggeredBy?: string;
}): Promise<string> {
  const run = await prisma.taskGenerationRun.create({
    data: {
      id: randomUUID(),
      scope: input.scope,
      clientId: input.clientId,
      dryRun: input.dryRun,
      status: "RUNNING",
      errors: [],
      triggeredBy: input.triggeredBy,
    },
  });
  return run.id;
}

async function finishGenerationRun(
  runId: string | undefined,
  result: GenerateResult,
  status: "SUCCESS" | "PARTIAL" | "FAILED"
): Promise<void> {
  if (!runId) return;

  await prisma.taskGenerationRun.update({
    where: { id: runId },
    data: {
      status,
      created: result.created,
      skipped: result.skipped,
      wouldCreate: result.wouldCreate,
      errors: result.errors,
      completedAt: new Date(),
    },
  });
}

function resultStatus(result: GenerateResult): "SUCCESS" | "PARTIAL" | "FAILED" {
  if (result.errors.length === 0) return "SUCCESS";
  if (result.created > 0 || result.wouldCreate > 0 || result.skipped > 0) return "PARTIAL";
  return "FAILED";
}

async function buildCandidate(input: {
  client: Client;
  taxType: Client["taxTypes"][number];
  assignedUserId: string;
  baseDate: Date;
}): Promise<GeneratedTaskCandidate | null> {
  const dueDate = await getDueDateByTaxTypeFromDb(input.taxType.name, input.baseDate);
  if (!dueDate) return null;

  const rule = await getRuleByTaxFormFromDb(input.taxType.name);
  const ruleUsed = rule
    ? `${rule.ruleCode}: ${input.taxType.name} — ${rule.name}`
    : input.taxType.name;

  return {
    clientId: input.client.id,
    clientName: input.client.companyName,
    taxTypeId: input.taxType.id,
    taxTypeName: input.taxType.name,
    assignedUserId: input.assignedUserId,
    fiscalYearEndDate: input.baseDate.toISOString(),
    dueDate: dueDate.toISOString(),
    ruleUsed,
  };
}

async function generateOneTask(input: {
  client: Client;
  taxType: Client["taxTypes"][number];
  assignedUserId: string;
  baseDate: Date;
  options: NormalizedGenerateOptions;
  result: GenerateResult;
}): Promise<void> {
  const { client, taxType, assignedUserId, baseDate, options, result } = input;

  const existingTask = await prisma.task.findFirst({
    where: {
      clientId: client.id,
      taxTypeId: taxType.id,
      fiscalYearEndDate: baseDate,
    },
    select: { id: true },
  });
  if (existingTask) {
    result.skipped++;
    return;
  }

  const candidate = await buildCandidate({ client, taxType, assignedUserId, baseDate });
  if (!candidate) {
    result.errors.push(`ไม่พบกฎสำหรับ ${taxType.name}`);
    return;
  }

  result.candidates.push(candidate);
  result.wouldCreate++;

  if (options.dryRun) return;

  try {
    await prisma.task.create({
      data: {
        id: randomUUID(),
        clientId: candidate.clientId,
        taxTypeId: candidate.taxTypeId,
        assignedUserId: candidate.assignedUserId,
        fiscalYearEndDate: new Date(candidate.fiscalYearEndDate),
        dueDate: new Date(candidate.dueDate),
        ruleUsed: candidate.ruleUsed,
        status: "TODO",
        priority: calcPriority(new Date(candidate.dueDate), options.now ?? new Date()),
        mddScore: 50,
      },
    });
    result.created++;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      result.skipped++;
      return;
    }
    throw error;
  }
}

async function generateTasksForLoadedClient(
  client: Client,
  options: NormalizedGenerateOptions
): Promise<GenerateResult> {
  const result = emptyResult(options.dryRun);
  const clientDefaultUserId = options.defaultAssignedUserId ?? client.assignedStaffId;
  const now = options.now ?? new Date();

  for (const taxType of client.taxTypes) {
    const assignedUserId = taxType.assignedStaffId ?? clientDefaultUserId;
    if (!assignedUserId) {
      result.errors.push(`ไม่พบผู้รับผิดชอบสำหรับ ${client.companyName} / ${taxType.name}`);
      continue;
    }

    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true },
    });
    if (!assignedUser) {
      result.errors.push(`ไม่พบผู้รับผิดชอบ ${assignedUserId} สำหรับ ${taxType.name}`);
      continue;
    }

    // Backfill only applies to MONTHLY tax types that have no task at all yet —
    // a taxType with existing history keeps the normal "next period" behavior.
    if (taxType.frequency === "MONTHLY" && options.backfillFrom) {
      const hasAnyTask = await prisma.task.findFirst({
        where: { clientId: client.id, taxTypeId: taxType.id },
        select: { id: true },
      });
      if (!hasAnyTask) {
        const baseDates = monthlyBackfillBaseDates(options.backfillFrom, now);
        for (const baseDate of baseDates) {
          await generateOneTask({ client, taxType, assignedUserId, baseDate, options, result });
        }
        continue;
      }
    }

    const baseDate =
      taxType.frequency === "MONTHLY"
        ? await getNextMonthlyBaseDate(client.id, taxType.id, now)
        : getNextFiscalYearEndDate(client, now);

    await generateOneTask({ client, taxType, assignedUserId, baseDate, options, result });
  }

  return result;
}

export async function generateTasksForClient(
  clientId: string,
  input?: string | GenerateOptions
): Promise<GenerateResult> {
  const options = normalizeOptions(input);
  const runId = options.recordRun
    ? await startGenerationRun({
        scope: "CLIENT",
        clientId,
        dryRun: options.dryRun,
        triggeredBy: options.triggeredBy,
      })
    : undefined;

  const result = emptyResult(options.dryRun);
  result.runId = runId;

  try {
    const client = await getClientByIdFromDb(clientId);
    if (!client) {
      result.errors.push(`Client ${clientId} not found`);
      await finishGenerationRun(runId, result, "FAILED");
      return result;
    }

    const clientResult = await generateTasksForLoadedClient(client, options);
    Object.assign(result, clientResult, { runId });
    await finishGenerationRun(runId, result, resultStatus(result));
    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown generation error");
    await finishGenerationRun(runId, result, "FAILED");
    throw error;
  }
}

export async function generateAllTasks(
  input?: string | GenerateOptions
): Promise<GenerateResult> {
  const options = normalizeOptions(input);
  const runId = options.recordRun
    ? await startGenerationRun({
        scope: "ALL",
        dryRun: options.dryRun,
        triggeredBy: options.triggeredBy,
      })
    : undefined;

  const totals = emptyResult(options.dryRun);
  totals.runId = runId;

  try {
    const clients = await getAllClientsFromDb();
    for (const client of clients) {
      const result = await generateTasksForLoadedClient(client, options);
      totals.created += result.created;
      totals.skipped += result.skipped;
      totals.wouldCreate += result.wouldCreate;
      totals.candidates.push(...result.candidates);
      totals.errors.push(...result.errors);
    }

    await finishGenerationRun(runId, totals, resultStatus(totals));
    return totals;
  } catch (error) {
    totals.errors.push(error instanceof Error ? error.message : "Unknown generation error");
    await finishGenerationRun(runId, totals, "FAILED");
    throw error;
  }
}
