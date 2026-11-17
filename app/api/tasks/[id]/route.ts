import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import {
  applyTaskWorkflowInDb,
  canUserAccessTask,
  deleteTodoTaskFromDb,
  getTaskByIdFromDb,
  updateTaskInDb,
  WorkflowError,
} from "@/lib/repositories/tasks";
import type { WorkflowAction } from "@/lib/taskWorkflow";
import { notifyClientPaid, notifyOfficePaid } from "@/lib/workflowNotify";

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

const workflowActionSchema = z
  .object({
    type: z.enum([
      "REQUEST_DOCS",
      "START",
      "FILE",
      "CLIENT_PAID",
      "OFFICE_PAID",
      "NOT_FILING",
      "REVERT",
      "SET_PAYMENT_TYPE",
    ]),
  })
  .passthrough();

const patchSchema = z.object({
  /** one workflow step; details are validated by lib/taskWorkflow */
  action: workflowActionSchema.optional(),
  note: z.string().optional(),
  evidenceUrls: z.array(z.string()).max(5, "แนบไฟล์ได้สูงสุด 5 ไฟล์").optional(),
  assignedUserId: z.string().min(1).optional(),
});

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

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Only supervisor can reassign tasks
  if (body.assignedUserId && session.user.role !== "SUPERVISOR") {
    return NextResponse.json(
      { error: "Only supervisors can reassign tasks" },
      { status: 403 }
    );
  }

  let updated = task;
  if (body.note !== undefined || body.evidenceUrls !== undefined || body.assignedUserId !== undefined) {
    const result = await updateTaskInDb(params.id, {
      note: body.note,
      evidenceUrls: body.evidenceUrls,
      assignedUserId: body.assignedUserId,
    });
    if (!result) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    updated = result;
  }

  if (body.action) {
    try {
      const step = await applyTaskWorkflowInDb(
        params.id,
        { id: session.user.id, role: session.user.role },
        body.action as unknown as WorkflowAction
      );
      updated = step.task;
      if (step.to === "AWAITING_OFFICE_PAYMENT" && step.from === "AWAITING_CLIENT_PAYMENT") {
        await notifyClientPaid(step.task);
      }
      if (step.to === "DONE" && step.from === "AWAITING_OFFICE_PAYMENT") {
        await notifyOfficePaid(step.task);
      }
    } catch (error) {
      if (error instanceof WorkflowError) {
        return NextResponse.json(
          { error: error.message, ...(error.code ? { code: error.code } : {}) },
          { status: error.status }
        );
      }
      throw error;
    }
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
