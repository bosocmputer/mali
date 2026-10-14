import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized, notifyBatch, utcDateString, type BatchResult } from "@/lib/cronNotify";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "d7" | "d5" | "d1" | "escalation"

  if (type === "d7") return handleReminder(7);
  if (type === "d5") return handleReminder(5);
  if (type === "d1") return handleD1();
  if (type === "escalation") return handleEscalation();

  return NextResponse.json({ error: "type must be d7, d5, d1, or escalation" }, { status: 400 });
}

function summarize(label: string, found: number, r: BatchResult): string {
  const parts = [`${label}: ${found} งาน — ส่ง ${r.notifiedUsers} คน`, `ข้าม ${r.skippedTasks} งาน (แจ้งแล้ววันนี้)`];
  if (r.usersWithoutLine > 0) parts.push(`ไม่มี LINE ${r.usersWithoutLine} คน`);
  if (r.failedUsers > 0) parts.push(`ส่งไม่สำเร็จ ${r.failedUsers} คน`);
  return parts.join(", ");
}

// ─── D-N: tasks due in exactly N days (REMINDER) ──────────────────────────────

async function handleReminder(days: number) {
  const target = utcDateString(days);
  const tasks = await prisma.task.findMany({
    where: { status: { not: "SUBMITTED" }, dueDate: { gte: new Date(target + "T00:00:00.000Z"), lte: new Date(target + "T23:59:59.999Z") } },
    include: { client: true, taxType: true },
  });

  const result = await notifyBatch("REMINDER", tasks, days);
  return NextResponse.json({
    message: summarize(`D-${days}`, tasks.length, result),
    ...result,
  });
}

// ─── D-1: tasks due tomorrow (ESCALATION — staff + team lead) ─────────────────

async function handleD1() {
  const target = utcDateString(1);
  const tasks = await prisma.task.findMany({
    where: { status: { not: "SUBMITTED" }, dueDate: { gte: new Date(target + "T00:00:00.000Z"), lte: new Date(target + "T23:59:59.999Z") } },
    include: { client: true, taxType: true },
  });

  const result = await notifyBatch("ESCALATION", tasks, 1);
  return NextResponse.json({
    message: summarize("D-1", tasks.length, result),
    ...result,
  });
}

// ─── Escalation: OVERDUE tasks (dueDate < today, not submitted) ───────────────

async function handleEscalation() {
  const today = new Date(utcDateString() + "T00:00:00.000Z");
  const tasks = await prisma.task.findMany({
    where: { status: { not: "SUBMITTED" }, dueDate: { lt: today } },
    include: { client: true, taxType: true },
  });

  const result = await notifyBatch("ESCALATION", tasks);
  return NextResponse.json({
    message: summarize("Escalation (overdue)", tasks.length, result),
    ...result,
  });
}
