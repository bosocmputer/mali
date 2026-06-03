import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCronAuthorized, notifyTask, utcDateString } from "@/lib/cronNotify";

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "d5" | "d1" | "escalation"

  if (type === "d5") return handleD5();
  if (type === "d1") return handleD1();
  if (type === "escalation") return handleEscalation();

  return NextResponse.json({ error: "type must be d5, d1, or escalation" }, { status: 400 });
}

// ─── D-5: tasks due in exactly 5 days ─────────────────────────────────────────

async function handleD5() {
  const target = utcDateString(5);
  const start = new Date(target + "T00:00:00.000Z");
  const end = new Date(target + "T23:59:59.999Z");

  const tasks = await prisma.task.findMany({
    where: { status: { not: "SUBMITTED" }, dueDate: { gte: start, lte: end } },
    include: { client: true, taxType: true },
  });

  let notified = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    try {
      const result = await notifyTask(
        task.id,
        task.assignedUserId,
        { taxType: task.taxType.name, company: task.client.companyName, dueDate: task.dueDate.toISOString(), teamId: task.client.teamId },
        "REMINDER",
        5
      );
      result.skipped ? skipped++ : (notified += result.recipients);
    } catch (e) {
      errors.push(`${task.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    message: `D-5: แจ้งเตือน ${tasks.length} งาน (ส่ง ${notified} คน, ข้าม ${skipped} งาน)`,
    total: tasks.length, notified, skipped, errors,
  });
}

// ─── D-1: tasks due tomorrow, escalate to team lead ───────────────────────────

async function handleD1() {
  const target = utcDateString(1);
  const start = new Date(target + "T00:00:00.000Z");
  const end = new Date(target + "T23:59:59.999Z");

  const tasks = await prisma.task.findMany({
    where: { status: { not: "SUBMITTED" }, dueDate: { gte: start, lte: end } },
    include: { client: true, taxType: true },
  });

  let notified = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    try {
      const result = await notifyTask(
        task.id,
        task.assignedUserId,
        { taxType: task.taxType.name, company: task.client.companyName, dueDate: task.dueDate.toISOString(), teamId: task.client.teamId },
        "ESCALATION",
        1
      );
      result.skipped ? skipped++ : (notified += result.recipients);
    } catch (e) {
      errors.push(`${task.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    message: `D-1: แจ้งเตือน ${tasks.length} งาน (ส่ง ${notified} คน, ข้าม ${skipped} งาน)`,
    total: tasks.length, notified, skipped, errors,
  });
}

// ─── Escalation: OVERDUE tasks (dueDate < today, not submitted) ───────────────

async function handleEscalation() {
  const today = new Date(utcDateString() + "T00:00:00.000Z");

  const tasks = await prisma.task.findMany({
    where: { status: { not: "SUBMITTED" }, dueDate: { lt: today } },
    include: { client: true, taxType: true },
  });

  let notified = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    try {
      const result = await notifyTask(
        task.id,
        task.assignedUserId,
        { taxType: task.taxType.name, company: task.client.companyName, dueDate: task.dueDate.toISOString(), teamId: task.client.teamId },
        "ESCALATION"
      );
      result.skipped ? skipped++ : (notified += result.recipients);
    } catch (e) {
      errors.push(`${task.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    message: `Escalation: แจ้งเตือน ${tasks.length} งาน overdue (ส่ง ${notified} คน, ข้าม ${skipped} งาน)`,
    total: tasks.length, notified, skipped, errors,
  });
}
