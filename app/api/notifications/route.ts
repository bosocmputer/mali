import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNotificationsFromDb } from "@/lib/repositories/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSupervisor = session.user.role === "SUPERVISOR";
  const userId = session.user.id;

  const notifications = (await getNotificationsFromDb({ isSupervisor, userId })).map(
    (notification) => ({
      ...notification,
      task: notification.task
        ? {
            taxTypeName: notification.task.taxType.name,
            companyName: notification.task.client.companyName,
            dueDate: notification.task.dueDate,
          }
        : null,
    })
  );

  return NextResponse.json({ data: notifications });
}
