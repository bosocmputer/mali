import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { applyTaskWorkflowInDb, WorkflowError } from "@/lib/repositories/tasks";
import { notifyOfficePaid } from "@/lib/workflowNotify";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาระบุวันที่ชำระ"),
  items: z
    .array(
      z.object({
        taskId: z.string().min(1),
        // FR-87: every item needs its own receipt list; one file may be listed on several items
        receiptUrls: z.array(z.string().min(1)).min(1, "ต้องแนบใบเสร็จครบทุกรายการ"),
      })
    )
    .min(1, "กรุณาเลือกรายการ")
    .max(100),
});

/**
 * Supervisor records government payments for one or many tasks at once (FR-81). Each task is
 * handled on its own, so one task that changed meanwhile doesn't block the others; the response
 * says which ones went through.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "เฉพาะผู้จัดการเท่านั้นที่บันทึกการชำระได้" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const done: string[] = [];
  const failed: { taskId: string; error: string }[] = [];
  for (const item of parsed.data.items) {
    try {
      const step = await applyTaskWorkflowInDb(
        item.taskId,
        { id: session.user.id, role: session.user.role },
        { type: "OFFICE_PAID", date: parsed.data.date, receiptUrls: item.receiptUrls }
      );
      done.push(item.taskId);
      await notifyOfficePaid(step.task);
    } catch (error) {
      if (!(error instanceof WorkflowError)) throw error;
      failed.push({ taskId: item.taskId, error: error.message });
    }
  }

  return NextResponse.json({ data: { done, failed } }, { status: failed.length && !done.length ? 409 : 200 });
}
