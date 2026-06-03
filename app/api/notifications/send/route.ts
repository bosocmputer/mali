import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createNotificationInDb } from "@/lib/repositories/notifications";
import { getTaskByIdFromDb } from "@/lib/repositories/tasks";
import { getAllTeamsFromDb } from "@/lib/repositories/teams";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { NotificationType } from "@/types";
import { formatThaiDate } from "@/lib/utils";

const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

const sendNotificationSchema = z.object({
  taskId: z.string().min(1),
  type: z.enum(["REMINDER", "ESCALATION", "MANUAL"]),
});

/**
 * Build a LINE text message for a task notification.
 * Uncomment the fetch call below once LINE_CHANNEL_ACCESS_TOKEN is set.
 */
function buildLineMessage(
  type: "REMINDER" | "ESCALATION" | "MANUAL",
  taskInfo: { taxType: string; company: string; dueDate: string }
): string {
  const due = formatThaiDate(taskInfo.dueDate);
  if (type === "ESCALATION") {
    return `🚨 [MALI] แจ้งเตือน Escalation\n\nงาน: ${taskInfo.taxType}\nบริษัท: ${taskInfo.company}\nครบกำหนด: ${due}\n\n⚠️ งานนี้ยังไม่เสร็จและใกล้ครบกำหนดแล้ว — โปรดตรวจสอบด่วน`;
  }
  if (type === "REMINDER") {
    return `📋 [MALI] แจ้งเตือนงานภาษี\n\nงาน: ${taskInfo.taxType}\nบริษัท: ${taskInfo.company}\nครบกำหนด: ${due}\n\nกรุณาดำเนินการให้ทันกำหนด`;
  }
  return `🔔 [MALI] แจ้งเตือนจากผู้จัดการ\n\nงาน: ${taskInfo.taxType}\nบริษัท: ${taskInfo.company}\nครบกำหนด: ${due}`;
}

async function sendLineMessage(lineUserId: string, message: string): Promise<void> {
  if (!LINE_CHANNEL_TOKEN) return; // No token yet — skip silently
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

/** Check if a task's due date is tomorrow (D-1) */
function isDueTomorrow(dueDateStr: string): boolean {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return dueDateStr.slice(0, 10) === tomorrow.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "taskId and type are required" }, { status: 400 });
  }
  const { taskId, type } = parsed.data;

  const task = await getTaskByIdFromDb(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const taskInfo = {
    taxType: task.taxType.name,
    company: task.client.companyName,
    dueDate: task.dueDate,
  };

  // Determine recipients
  const recipientIds: string[] = [task.assignedUserId];
  let escalated = false;

  // D-1 check: escalate to team lead if due tomorrow and task not yet submitted
  if ((isDueTomorrow(task.dueDate) && task.status !== "SUBMITTED") || type === "ESCALATION") {
    const teams = await getAllTeamsFromDb();
    const clientTeamId = task.client.teamId;
    const team = clientTeamId
      ? teams.find((t) => t.id === clientTeamId)
      : teams.find((t) => t.memberIds.includes(task.assignedUserId));

    if (team && !recipientIds.includes(team.leadUserId)) {
      recipientIds.push(team.leadUserId);
      escalated = true;
    }
  }

  const notifType = (escalated ? "ESCALATION" : type) as NotificationType;
  const message = buildLineMessage(
    escalated ? "ESCALATION" : (type as "REMINDER" | "ESCALATION" | "MANUAL"),
    taskInfo
  );

  // Log + send LINE (silently skipped if no token)
  for (const userId of recipientIds) {
    await createNotificationInDb({ taskId, userId, type: notifType });
    const user = await getUserByIdFromDb(userId);
    if (user?.lineUserId) {
      await sendLineMessage(user.lineUserId, message);
    }
  }

  const responseMessage = escalated
    ? `ส่งการแจ้งเตือน (Escalation) ให้ ${recipientIds.length} คน${LINE_CHANNEL_TOKEN ? "" : " [LINE ยังไม่เชื่อมต่อ]"}`
    : `ส่งการแจ้งเตือนแล้ว${LINE_CHANNEL_TOKEN ? "" : " [LINE ยังไม่เชื่อมต่อ]"}`;

  return NextResponse.json({ message: responseMessage, escalated, recipients: recipientIds.length });
}
