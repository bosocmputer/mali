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

  for (const userId of recipientIds) {
    await createNotificationInDb({ taskId, userId, type: notifType });
    const user = await getUserByIdFromDb(userId);
    if (user?.lineUserId) {
      await sendLineMessage(user.lineUserId, flex);
    }
  }

  const responseMessage = escalated
    ? `ส่งการแจ้งเตือน (Escalation) ให้ ${recipientIds.length} คน`
    : `ส่งการแจ้งเตือนแล้ว`;

  return NextResponse.json({ message: responseMessage, escalated, recipients: recipientIds.length });
}
