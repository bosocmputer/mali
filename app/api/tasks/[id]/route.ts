import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTaskById, updateTask } from "@/data/mockData";
import { TaskStatus } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = getTaskById(params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Staff can only view their own tasks
  if (
    session.user.role === "STAFF" &&
    task.assignedUserId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data: task });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = getTaskById(params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Staff can only update their own tasks
  if (
    session.user.role === "STAFF" &&
    task.assignedUserId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Only supervisor can reassign tasks
  if (body.assignedUserId && session.user.role !== "SUPERVISOR") {
    return NextResponse.json(
      { error: "Only supervisors can reassign tasks" },
      { status: 403 }
    );
  }

  const updates: Partial<{
    status: TaskStatus;
    note: string;
    evidenceUrl: string;
    assignedUserId: string;
  }> = {};

  if (body.status !== undefined) updates.status = body.status as TaskStatus;
  if (body.note !== undefined) updates.note = body.note;
  if (body.evidenceUrl !== undefined) updates.evidenceUrl = body.evidenceUrl;
  if (body.assignedUserId !== undefined)
    updates.assignedUserId = body.assignedUserId;

  const updated = updateTask(params.id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
