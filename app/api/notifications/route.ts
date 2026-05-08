import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllNotifications, getTaskById, getUserById } from "@/data/mockData";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSupervisor = session.user.role === "SUPERVISOR";
  const userId = session.user.id;

  const notifications = getAllNotifications()
    .filter((n) => isSupervisor || n.userId === userId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .map((n) => {
      const task = getTaskById(n.taskId);
      const user = getUserById(n.userId);
      return {
        ...n,
        task: task
          ? { taxTypeName: task.taxType.name, companyName: task.client.companyName, dueDate: task.dueDate }
          : null,
        user: user ? { name: user.name } : null,
      };
    });

  return NextResponse.json({ data: notifications });
}
