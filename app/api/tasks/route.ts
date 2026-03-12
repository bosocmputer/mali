import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTasks, getTasksByUser } from "@/data/mockData";
import { TaskStatus } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as TaskStatus | null;
  const clientId = searchParams.get("clientId");
  const assignedUserId = searchParams.get("assignedUserId");
  const month = searchParams.get("month"); // 1–12
  const year = searchParams.get("year");
  const search = searchParams.get("search");

  const isSupervisor = session.user.role === "SUPERVISOR";
  const userId = session.user.id;

  // STAFF can only see their own tasks
  let tasks = isSupervisor ? getAllTasks() : getTasksByUser(userId);

  // Apply filters
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (clientId) {
    tasks = tasks.filter((t) => t.clientId === clientId);
  }
  if (isSupervisor && assignedUserId) {
    tasks = tasks.filter((t) => t.assignedUserId === assignedUserId);
  }
  if (month && year) {
    const m = parseInt(month);
    const y = parseInt(year);
    tasks = tasks.filter((t) => {
      const due = new Date(t.dueDate);
      return due.getMonth() + 1 === m && due.getFullYear() === y;
    });
  }
  if (search) {
    const q = search.toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.client.companyName.toLowerCase().includes(q) ||
        t.taxType.name.toLowerCase().includes(q)
    );
  }

  // Sort by due date ascending
  tasks = tasks.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return NextResponse.json({ data: tasks });
}
