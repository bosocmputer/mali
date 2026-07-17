import { NextRequest } from "next/server";
import { formatThaiDate } from "@/lib/utils";
import { createNotificationInDb } from "@/lib/repositories/notifications";
import { getAllTeamsFromDb } from "@/lib/repositories/teams";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { prisma } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

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

export async function sendLineMessage(lineUserId: string, message: string | object): Promise<void> {
  if (!LINE_CHANNEL_TOKEN) return;
  const msg = typeof message === "string"
    ? { type: "text", text: message }
    : message;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages: [msg] }),
  });
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
  skippedTasks: number;
  errors: string[];
};

export async function notifyBatch(
  type: "REMINDER" | "ESCALATION",
  tasks: CronTask[],
  daysLeft?: number
): Promise<BatchResult> {
  const today = utcDateString();
  const todayStart = new Date(today + "T00:00:00.000Z");
  const todayEnd = new Date(today + "T23:59:59.999Z");
  const errors: string[] = [];

  // Dedup: find all task IDs already notified today for this type
  const alreadyNotified = await prisma.notificationLog.findMany({
    where: {
      taskId: { in: tasks.map((t) => t.id) },
      type,
      sentAt: { gte: todayStart, lt: todayEnd },
    },
    select: { taskId: true },
  });
  const notifiedIds = new Set(alreadyNotified.map((n) => n.taskId));
  const pendingTasks = tasks.filter((t) => !notifiedIds.has(t.id));
  const skippedTasks = tasks.length - pendingTasks.length;

  if (pendingTasks.length === 0) {
    return { totalTasks: tasks.length, notifiedUsers: 0, skippedTasks, errors };
  }

  // Group pending tasks by assignedUserId
  const byUser = new Map<string, CronTask[]>();
  for (const task of pendingTasks) {
    const list = byUser.get(task.assignedUserId) ?? [];
    list.push(task);
    byUser.set(task.assignedUserId, list);
  }

  // ESCALATION: also build a group for each team lead
  if (type === "ESCALATION") {
    const teams = await getAllTeamsFromDb();
    for (const task of pendingTasks) {
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

  let notifiedUsers = 0;

  for (const [userId, userTasks] of Array.from(byUser.entries())) {
    try {
      // Log notification for each task (for the assigned user only, not duplicated for lead)
      const isAssignedUser = userTasks.some((t: CronTask) => t.assignedUserId === userId);
      if (isAssignedUser) {
        for (const task of userTasks.filter((t: CronTask) => t.assignedUserId === userId)) {
          await createNotificationInDb({ taskId: task.id, userId, type });
        }
      }

      const user = await getUserByIdFromDb(userId);
      if (user?.lineUserId) {
        const taskItems: TaskItem[] = userTasks.map((t) => ({
          taxType: t.taxType.name,
          company: t.client.companyName,
          dueDate: t.dueDate.toISOString(),
        }));
        const flex = buildFlexMessage(type, taskItems, daysLeft);
        await sendLineMessage(user.lineUserId, flex);
        notifiedUsers++;
      }
    } catch (e) {
      errors.push(`user ${userId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { totalTasks: tasks.length, notifiedUsers, skippedTasks, errors };
}
