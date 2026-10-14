import { NextRequest } from "next/server";
import { formatThaiDate } from "@/lib/utils";
import { createNotificationInDb } from "@/lib/repositories/notifications";
import { getAllTeamsFromDb } from "@/lib/repositories/teams";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { prisma } from "@/lib/db";
import { sendLineMessage } from "@/lib/lineClient";

export { sendLineMessage, LineSendError } from "@/lib/lineClient";

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

type TaskItem = { taxType: string; company: string; dueDate: string };

const FLEX_MAX_ITEMS = 10;

export function buildFlexMessage(
  type: "REMINDER" | "ESCALATION",
  tasks: TaskItem[],
  daysLeft?: number
): object {
  const isEscalation = type === "ESCALATION";
  const headerColor = isEscalation ? "#C0392B" : "#1E3A5F";
  const headerEmoji = isEscalation ? "🚨" : "📋";
  const headerLabel = isEscalation ? "งานด่วน — ต้องดำเนินการ" : "แจ้งเตือนงานภาษี";
  const dayTag = daysLeft !== undefined ? ` (อีก ${daysLeft} วัน)` : "";
  const shown = tasks.slice(0, FLEX_MAX_ITEMS);
  const overflow = tasks.length - shown.length;

  const taskRows: unknown[] = shown.flatMap((t, i) => {
    const row = {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: t.taxType,
              weight: "bold",
              size: "sm",
              color: "#111111",
              flex: 2,
              wrap: true,
            },
            {
              type: "text",
              text: t.company,
              size: "sm",
              color: "#444444",
              flex: 3,
              wrap: true,
              align: "end",
            },
          ],
        },
        {
          type: "text",
          text: `ครบกำหนด: ${formatThaiDate(t.dueDate)}`,
          size: "xs",
          color: isEscalation ? "#C0392B" : "#888888",
        },
      ],
    };
    if (i < shown.length - 1) {
      return [row, { type: "separator", margin: "sm" }];
    }
    return [row];
  });

  if (overflow > 0) {
    taskRows.push({ type: "separator", margin: "sm" });
    taskRows.push({
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [{
        type: "text",
        text: `และอีก ${overflow} งาน...`,
        size: "xs",
        color: "#888888",
        margin: "sm",
      }],
    });
  }

  const footerText = isEscalation
    ? "⚠️ งานเหล่านี้ยังไม่เสร็จ — โปรดตรวจสอบด่วน"
    : "กรุณาดำเนินการให้ทันกำหนด";

  const altText = `${headerEmoji} ${headerLabel}${dayTag} — ${tasks.length} งาน`;

  return {
    type: "flex",
    altText,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headerColor,
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: `${headerEmoji} [MALI] ${headerLabel}`,
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
            wrap: true,
          },
          {
            type: "text",
            text: `${dayTag ? dayTag.trim() + " — " : ""}${tasks.length} งาน`,
            color: "#DDDDDD",
            size: "sm",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "lg",
        contents: taskRows,
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: isEscalation ? "#FDF0EE" : "#F5F5F5",
        paddingAll: "md",
        contents: [
          {
            type: "text",
            text: footerText,
            size: "xs",
            color: isEscalation ? "#C0392B" : "#888888",
            wrap: true,
            align: "center",
          },
        ],
      },
    },
  };
}

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
  for (const task of tasks) {
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

      const taskItems: TaskItem[] = pending.map((t) => ({
        taxType: t.taxType.name,
        company: t.client.companyName,
        dueDate: t.dueDate.toISOString(),
      }));
      await sendLineMessage(user.lineUserId, buildFlexMessage(type, taskItems, daysLeft));
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
