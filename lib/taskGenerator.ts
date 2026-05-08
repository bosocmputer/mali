import { Client, Task } from "@/types";
import { getAllTasks, createTask, getClientById, getAllClients, getUserById, getAllRules } from "@/data/mockData";
import { getDueDateByTaxType, getLastDayOfMonth } from "@/lib/ruleEngine";

interface GenerateResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Calculate the next fiscal year end date for a client relative to today.
 * Returns the soonest upcoming (or current) fiscal year end date.
 */
function getNextFiscalYearEndDate(client: Client): Date {
  const month = client.fiscalYearEnd;
  const day = client.fiscalYearEndDay ?? new Date(Date.UTC(2000, month, 0)).getUTCDate();
  const today = new Date();
  const thisYear = today.getUTCFullYear();

  const candidate = new Date(Date.UTC(thisYear, month - 1, day));
  if (candidate >= today) return candidate;
  return new Date(Date.UTC(thisYear + 1, month - 1, day));
}

/**
 * Get the next monthly base date for generating the next period task.
 *
 * Logic:
 * - Find the most recent existing task for this (client, taxType)
 * - If found: next base = last day of the month AFTER that task's fiscalYearEndDate
 *   e.g. last task base = 2026-05-31 → next base = 2026-06-30
 * - If none found: use current month end as base (first task ever)
 */
function getNextMonthlyBaseDate(
  clientId: string,
  taxTypeId: string,
  allTasks: Task[]
): Date {
  const clientTasks = allTasks
    .filter((t) => t.clientId === clientId && t.taxTypeId === taxTypeId)
    .sort((a, b) => b.fiscalYearEndDate.localeCompare(a.fiscalYearEndDate));

  if (clientTasks.length > 0) {
    // Advance one month past the last task's base date
    const lastBase = new Date(clientTasks[0].fiscalYearEndDate);
    const y = lastBase.getUTCFullYear();
    const m = lastBase.getUTCMonth() + 1; // 1-based
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    return getLastDayOfMonth(nextM, nextY);
  }

  // No existing task — use current month end
  const now = new Date();
  return getLastDayOfMonth(now.getUTCMonth() + 1, now.getUTCFullYear());
}

/**
 * Generate tasks for a single client for the next period.
 * Skips tasks that already exist (dedup by clientId + taxTypeId + fiscalYearEndDate).
 * Returns the count of created and skipped tasks.
 */
export function generateTasksForClient(
  clientId: string,
  defaultAssignedUserId?: string
): GenerateResult {
  const client = getClientById(clientId);
  if (!client) return { created: 0, skipped: 0, errors: [`Client ${clientId} not found`] };

  const existingTasks = getAllTasks();
  const clientDefaultUserId =
    defaultAssignedUserId ??
    client.assignedStaffId ??
    "user-2";

  const result: GenerateResult = { created: 0, skipped: 0, errors: [] };

  for (const taxType of client.taxTypes) {
    // Per-taxType staff overrides client default
    const assignedUserId = taxType.assignedStaffId ?? clientDefaultUserId;
    const assignedUser = getUserById(assignedUserId);
    if (!assignedUser) {
      result.errors.push(`ไม่พบผู้รับผิดชอบ ${assignedUserId} สำหรับ ${taxType.name}`);
      continue;
    }

    let baseDate: Date;

    if (taxType.frequency === "MONTHLY") {
      baseDate = getNextMonthlyBaseDate(client.id, taxType.id, existingTasks);
    } else {
      baseDate = getNextFiscalYearEndDate(client);
    }

    const fiscalYearEndDate = baseDate.toISOString();

    // Dedup check: same client + same taxType + same fiscalYearEndDate (date part only)
    const dateKey = fiscalYearEndDate.slice(0, 10);
    const duplicate = existingTasks.find(
      (t) =>
        t.clientId === client.id &&
        t.taxTypeId === taxType.id &&
        t.fiscalYearEndDate.slice(0, 10) === dateKey
    );
    if (duplicate) {
      result.skipped++;
      continue;
    }

    const dueDate = getDueDateByTaxType(taxType.name, baseDate);
    if (!dueDate) {
      result.errors.push(`ไม่พบกฎสำหรับ ${taxType.name}`);
      continue;
    }

    const rule = getAllRules().find((r) => r.taxForm === taxType.name);
    const ruleUsed = rule ? `${rule.ruleCode}: ${taxType.name} — ${rule.name}` : taxType.name;

    createTask({
      clientId: client.id,
      client,
      taxTypeId: taxType.id,
      taxType,
      assignedUserId,
      assignedUser,
      fiscalYearEndDate,
      dueDate: dueDate.toISOString(),
      ruleUsed,
      status: "TODO",
      priority: "MEDIUM",
    });
    result.created++;
  }

  return result;
}

/**
 * Generate tasks for all clients.
 */
export function generateAllTasks(defaultAssignedUserId?: string): GenerateResult {
  const clients = getAllClients();
  const totals: GenerateResult = { created: 0, skipped: 0, errors: [] };

  for (const client of clients) {
    const r = generateTasksForClient(client.id, defaultAssignedUserId);
    totals.created += r.created;
    totals.skipped += r.skipped;
    totals.errors.push(...r.errors);
  }

  return totals;
}
