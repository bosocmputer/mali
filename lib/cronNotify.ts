import { NextRequest } from "next/server";
import { createNotificationInDb } from "@/lib/repositories/notifications";
import { getAllTeamsFromDb } from "@/lib/repositories/teams";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { prisma } from "@/lib/db";
import { sendLineMessage } from "@/lib/lineClient";
import { buildFlexMessage, type TaskItem } from "@/lib/lineFlex";
import { reminderListLink, taskLink } from "@/lib/appLinks";

export { sendLineMessage, LineSendError } from "@/lib/lineClient";
export { buildFlexMessage } from "@/lib/lineFlex";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function isCronAuthorized(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const xHeader = req.headers.get("x-cron-secret");
  if (xHeader === CRON_SECRET) return true;
  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${CRON_SECRET}`) return true;
  return false;
}

// ─── LINE helpers ─────────────────────────────────────────────────────────────

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns date string "YYYY-MM-DD" for today+offsetDays in Asia/Bangkok time */
export function utcDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

// ─── Batch notify (1 message per user per round) ──────────────────────────────

type CronTask = {
  id: string;
  assignedUserId: string;
  dueDate: Date;
  client: { companyName: string; teamId: string | null };
  taxType: { name: string };
};

export type BatchResult = {
  totalTasks: number;
  notifiedUsers: number;
  /** tasks whose every recipient was already notified today */
  skippedTasks: number;
  /** recipients whose LINE send failed even after retries — not logged, so re-running today retries them */
  failedUsers: number;
  /** recipients with no linked LINE account — nothing is sent or logged for them */
  usersWithoutLine: number;
  errors: string[];
};

export async function notifyBatch(
  type: "REMINDER" | "ESCALATION",
  tasks: CronTask[],
  daysLeft?: number
): Promise<BatchResult> {
  const errors: string[] = [];
  const result: BatchResult = {
    totalTasks: tasks.length,
    notifiedUsers: 0,
    skippedTasks: 0,
    failedUsers: 0,
    usersWithoutLine: 0,
    errors,
  };
  if (tasks.length === 0) return result;

  // Recipients: the assignee of each task; for ESCALATION also that task's team lead
  const byUser = new Map<string, CronTask[]>();
  const openable = new Map<string, Set<string>>(); // recipient -> task ids they can open in MALI
  const allowOpen = (userId: string, taskId: string) => {
    const set = openable.get(userId) ?? new Set<string>();
    set.add(taskId);
    openable.set(userId, set);
  };
  for (const task of tasks) {
    allowOpen(task.assignedUserId, task.id);
    const list = byUser.get(task.assignedUserId) ?? [];
    list.push(task);
    byUser.set(task.assignedUserId, list);
  }

  if (type === "ESCALATION") {
    const teams = await getAllTeamsFromDb();
    for (const task of tasks) {
      const team = task.client.teamId
        ? teams.find((t) => t.id === task.client.teamId)
        : teams.find((t) => t.memberIds.includes(task.assignedUserId));
      if (team && team.leadUserId !== task.assignedUserId) {
        const list = byUser.get(team.leadUserId) ?? [];
        if (!list.find((t) => t.id === task.id)) list.push(task);
        byUser.set(team.leadUserId, list);
        allowOpen(team.leadUserId, task.id); // a team lead can open their team's tasks
      }
    }
  }

  // Dedup per (task, recipient): a log row means that person already got this task today
  const today = utcDateString();
  const alreadySent = await prisma.notificationLog.findMany({
    where: {
      taskId: { in: tasks.map((t) => t.id) },
      type,
      sentAt: { gte: new Date(today + "T00:00:00.000Z"), lt: new Date(today + "T23:59:59.999Z") },
    },
    select: { taskId: true, userId: true },
  });
  const sentKeys = new Set(alreadySent.map((n) => `${n.taskId}:${n.userId}`));

  const pendingTaskIds = new Set<string>();

  for (const [userId, userTasks] of Array.from(byUser.entries())) {
    const pending = userTasks.filter((t) => !sentKeys.has(`${t.id}:${userId}`));
    if (pending.length === 0) continue;
    pending.forEach((t) => pendingTaskIds.add(t.id));

    try {
      const user = await getUserByIdFromDb(userId);
      if (!user?.lineUserId) {
        result.usersWithoutLine++;
        continue;
      }

      // A row is tappable only if this recipient can open that task in MALI: supervisors can open
      // anything; staff can open their own tasks and, as team lead, their team's.
      const canOpen = (t: CronTask) => user.role === "SUPERVISOR" || !!openable.get(userId)?.has(t.id);
      const taskItems: TaskItem[] = pending.map((t) => ({
        taxType: t.taxType.name,
        company: t.client.companyName,
        dueDate: t.dueDate.toISOString(),
        url: canOpen(t) ? taskLink(t.id) : undefined,
      }));
      const openUrl = reminderListLink(daysLeft, pending[0].dueDate);
      await sendLineMessage(
        user.lineUserId,
        buildFlexMessage(type, taskItems, daysLeft, { openUrl })
      );
    } catch (e) {
      result.failedUsers++;
      errors.push(`user ${userId}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    result.notifiedUsers++;

    // Log only after LINE accepted the message. If logging itself fails the message
    // was still sent, so count it as notified and report the logging problem.
    try {
      for (const task of pending) {
        await createNotificationInDb({ taskId: task.id, userId, type });
      }
    } catch (e) {
      errors.push(`log user ${userId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  result.skippedTasks = tasks.length - pendingTaskIds.size;
  return result;
}
