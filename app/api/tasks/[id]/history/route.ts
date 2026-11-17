import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  canUserAccessTask,
  getTaskByIdFromDb,
  getTaskStatusHistoryFromDb,
} from "@/lib/repositories/tasks";

/** Status history of one task (FR-83), newest first. Same access as the task itself. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const task = await getTaskByIdFromDb(params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (!(await canUserAccessTask(session.user, task))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ data: await getTaskStatusHistoryFromDb(params.id) });
}
