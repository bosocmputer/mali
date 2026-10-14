import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createNotificationInDb } from "@/lib/repositories/notifications";
import { getTaskByIdFromDb } from "@/lib/repositories/tasks";
import { getAllTeamsFromDb } from "@/lib/repositories/teams";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { NotificationType } from "@/types";
import { buildFlexMessage, sendLineMessage } from "@/lib/cronNotify";

const sendNotificationSchema = z.object({
  taskId: z.string().min(1),
  type: z.enum(["REMINDER", "ESCALATION", "MANUAL"]),
});

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

  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งค่า LINE Channel Access Token" }, { status: 503 });
  }

  // Determine recipients
  const recipientIds: string[] = [task.assignedUserId];
  let escalated = false;

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
  const flexType = escalated ? "ESCALATION" : "REMINDER";

  const taskItem = {
    taxType: task.taxType.name,
    company: task.client.companyName,
    dueDate: task.dueDate,
  };

  const flex = buildFlexMessage(flexType, [taskItem]);

  // Log only people LINE actually accepted the message for — otherwise the history
  // claims a notification was sent when it was not.
  const reached: string[] = [];
  const failed: string[] = [];
  const withoutLine: string[] = [];
  for (const userId of recipientIds) {
    const user = await getUserByIdFromDb(userId);
    if (!user?.lineUserId) {
      withoutLine.push(user?.name ?? userId);
      continue;
    }
    try {
      await sendLineMessage(user.lineUserId, flex);
    } catch {
      failed.push(user.name);
      continue;
    }
    await createNotificationInDb({ taskId, userId, type: notifType });
    reached.push(user.name);
  }

  if (reached.length === 0) {
    const problems = [
      failed.length > 0 ? `ส่ง LINE ไม่สำเร็จ: ${failed.join(", ")}` : "",
      withoutLine.length > 0 ? `ยังไม่ได้เชื่อมต่อ LINE: ${withoutLine.join(", ")}` : "",
    ].filter(Boolean);
    return NextResponse.json(
      { error: `ไม่ได้ส่งการแจ้งเตือนให้ใครเลย — ${problems.join(" / ")}` },
      { status: failed.length > 0 ? 502 : 422 }
    );
  }

  const responseMessage = [
    escalated ? `ส่งการแจ้งเตือน (Escalation) ให้ ${reached.length} คน` : "ส่งการแจ้งเตือนแล้ว",
    failed.length > 0 ? `ส่งไม่สำเร็จ: ${failed.join(", ")}` : "",
    withoutLine.length > 0 ? `ยังไม่ได้เชื่อมต่อ LINE: ${withoutLine.join(", ")}` : "",
  ].filter(Boolean).join(" — ");

  return NextResponse.json({ message: responseMessage, escalated, recipients: reached.length });
}
