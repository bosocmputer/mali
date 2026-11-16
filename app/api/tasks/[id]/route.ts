import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TaskStatus } from "@/types";
import {
  canUserAccessTask,
  deleteTodoTaskFromDb,
  getTaskByIdFromDb,
  updateTaskInDb,
} from "@/lib/repositories/tasks";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = await getTaskByIdFromDb(params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Staff can view their own tasks, plus their team's if they lead one
  if (!(await canUserAccessTask(session.user, task))) {
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

  const task = await getTaskByIdFromDb(params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Staff can update their own tasks, plus their team's if they lead one
  if (!(await canUserAccessTask(session.user, task))) {
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

  const VALID_STATUSES: TaskStatus[] = ["TODO", "PROCESSING", "SUBMITTED"];

  const updates: Partial<{
    status: TaskStatus;
    note: string;
    evidenceUrls: string[];
    assignedUserId: string;
  }> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }
    updates.status = body.status as TaskStatus;
  }
  if (body.note !== undefined) updates.note = body.note;
  if (body.evidenceUrls !== undefined) {
    if (!Array.isArray(body.evidenceUrls) || body.evidenceUrls.length > 5) {
      return NextResponse.json({ error: "แนบไฟล์ได้สูงสุด 5 ไฟล์" }, { status: 400 });
    }
    updates.evidenceUrls = body.evidenceUrls;
  }
  if (body.assignedUserId !== undefined)
    updates.assignedUserId = body.assignedUserId;

  const updated = await updateTaskInDb(params.id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

/** Supervisor only, and only while the task is still TODO. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "เฉพาะผู้จัดการเท่านั้นที่ลบงานได้" }, { status: 403 });
  }

  const result = await deleteTodoTaskFromDb(params.id);
  if (result === "NOT_FOUND") {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (result === "NOT_TODO") {
    return NextResponse.json(
      { error: "ลบได้เฉพาะงานที่ยังรอดำเนินการ" },
      { status: 409 }
    );
  }
  return NextResponse.json({ data: { id: params.id } });
}
