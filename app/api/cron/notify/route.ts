import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized, notifyBatch, utcDateString } from "@/lib/cronNotify";

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

// ─── D-N: tasks due in exactly N days (REMINDER) ──────────────────────────────

async function handleReminder(days: number) {
  const target = utcDateString(days);
  const tasks = await prisma.task.findMany({
    where: { status: { not: "SUBMITTED" }, dueDate: { gte: new Date(target + "T00:00:00.000Z"), lte: new Date(target + "T23:59:59.999Z") } },
    include: { client: true, taxType: true },
  });

  const result = await notifyBatch("REMINDER", tasks, days);
  return NextResponse.json({
    message: `D-${days}: ${tasks.length} งาน — ส่ง ${result.notifiedUsers} คน, ข้าม ${result.skippedTasks} งาน`,
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
    message: `D-1: ${tasks.length} งาน — ส่ง ${result.notifiedUsers} คน, ข้าม ${result.skippedTasks} งาน`,
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
    message: `Escalation: ${tasks.length} งาน overdue — ส่ง ${result.notifiedUsers} คน, ข้าม ${result.skippedTasks} งาน`,
    ...result,
  });
}
