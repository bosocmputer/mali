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

export function buildLineMessage(
  type: "REMINDER" | "ESCALATION",
  taskInfo: { taxType: string; company: string; dueDate: string },
  daysLeft?: number
): string {
  const due = formatThaiDate(taskInfo.dueDate);
  const dayTag = daysLeft !== undefined ? ` (อีก ${daysLeft} วัน)` : "";
  if (type === "ESCALATION") {
    return `🚨 [MALI] แจ้งเตือน Escalation\n\nงาน: ${taskInfo.taxType}\nบริษัท: ${taskInfo.company}\nครบกำหนด: ${due}\n\n⚠️ งานนี้ยังไม่เสร็จและใกล้ครบกำหนดแล้ว — โปรดตรวจสอบด่วน`;
  }
  return `📋 [MALI] แจ้งเตือนงานภาษี${dayTag}\n\nงาน: ${taskInfo.taxType}\nบริษัท: ${taskInfo.company}\nครบกำหนด: ${due}\n\nกรุณาดำเนินการให้ทันกำหนด`;
}

export async function sendLineMessage(lineUserId: string, message: string): Promise<void> {
  if (!LINE_CHANNEL_TOKEN) return;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: message }],
    }),
  });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns UTC date string "YYYY-MM-DD" for today+offsetDays */
export function utcDateString(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ─── Core notify logic ────────────────────────────────────────────────────────

type NotifyTaskResult = { taskId: string; recipients: number; skipped: boolean };

/**
 * Notify all assigned users (and optionally team leads) for a single task.
 * Skips if a notification of the same type was already sent today.
 */
export async function notifyTask(
  taskId: string,
  assignedUserId: string,
  taskInfo: { taxType: string; company: string; dueDate: string; teamId?: string | null },
  type: "REMINDER" | "ESCALATION",
  daysLeft?: number
): Promise<NotifyTaskResult> {
  const today = utcDateString();

  // Dedup: skip if already notified today for this task+type
  const existing = await prisma.notificationLog.findFirst({
    where: {
      taskId,
      type,
      sentAt: { gte: new Date(today + "T00:00:00.000Z"), lt: new Date(today + "T23:59:59.999Z") },
    },
  });
  if (existing) return { taskId, recipients: 0, skipped: true };

  const recipientIds: string[] = [assignedUserId];

  // Escalation: also notify team lead
  if (type === "ESCALATION") {
    const teams = await getAllTeamsFromDb();
    const team = taskInfo.teamId
      ? teams.find((t) => t.id === taskInfo.teamId)
      : teams.find((t) => t.memberIds.includes(assignedUserId));
    if (team && !recipientIds.includes(team.leadUserId)) {
      recipientIds.push(team.leadUserId);
    }
  }

  const message = buildLineMessage(type, taskInfo, daysLeft);

  for (const userId of recipientIds) {
    await createNotificationInDb({ taskId, userId, type });
    const user = await getUserByIdFromDb(userId);
    if (user?.lineUserId) {
      await sendLineMessage(user.lineUserId, message);
    }
  }

  return { taskId, recipients: recipientIds.length, skipped: false };
}
