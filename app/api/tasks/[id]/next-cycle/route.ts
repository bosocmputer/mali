import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTaskById, createTask, getAllTasks } from "@/data/mockData";
import { getDueDateByTaxType, getRuleByTaxForm } from "@/lib/ruleEngine";
import { getLastDayOfMonth } from "@/lib/ruleEngine";

function nextFiscalYearEndDate(task: {
  fiscalYearEndDate: string;
  client: { fiscalYearEnd: number; fiscalYearEndDay: number };
}): string {
  const current = new Date(task.fiscalYearEndDate);
  const currentYear = current.getUTCFullYear();
  const endMonth = task.client.fiscalYearEnd;
  const endDay = task.client.fiscalYearEndDay;

  // Next cycle: same month/day, one year later
  const nextYear = currentYear + 1;
  // Clamp to last day of that month in case endDay > actual days
  const lastDay = getLastDayOfMonth(endMonth, nextYear);
  const clampedDay = Math.min(endDay, lastDay.getUTCDate());
  return new Date(Date.UTC(nextYear, endMonth - 1, clampedDay)).toISOString();
}

/** GET /api/tasks/[id]/next-cycle — preview next cycle due date */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = getTaskById(params.id);
  if (!task) return NextResponse.json({ error: "ไม่พบงาน" }, { status: 404 });

  const nextFYE = nextFiscalYearEndDate(task);
  const baseDate = new Date(nextFYE);
  const dueDate = getDueDateByTaxType(task.taxType.name, baseDate);

  if (!dueDate) {
    return NextResponse.json(
      { error: `ไม่มีกฎสำหรับ ${task.taxType.name}` },
      { status: 400 }
    );
  }

  // Check for duplicate
  const existing = getAllTasks().find(
    (t) =>
      t.clientId === task.clientId &&
      t.taxTypeId === task.taxTypeId &&
      t.fiscalYearEndDate.slice(0, 10) === nextFYE.slice(0, 10)
  );

  return NextResponse.json({
    data: {
      nextFiscalYearEndDate: nextFYE,
      nextDueDate: dueDate.toISOString(),
      alreadyExists: !!existing,
    },
  });
}

/** POST /api/tasks/[id]/next-cycle — create next cycle task */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden — เฉพาะ Supervisor เท่านั้น" }, { status: 403 });
  }

  const task = getTaskById(params.id);
  if (!task) return NextResponse.json({ error: "ไม่พบงาน" }, { status: 404 });

  const nextFYE = nextFiscalYearEndDate(task);
  const baseDate = new Date(nextFYE);
  const dueDate = getDueDateByTaxType(task.taxType.name, baseDate);

  if (!dueDate) {
    return NextResponse.json(
      { error: `ไม่มีกฎสำหรับ ${task.taxType.name}` },
      { status: 400 }
    );
  }

  // Prevent duplicates
  const existing = getAllTasks().find(
    (t) =>
      t.clientId === task.clientId &&
      t.taxTypeId === task.taxTypeId &&
      t.fiscalYearEndDate.slice(0, 10) === nextFYE.slice(0, 10)
  );
  if (existing) {
    return NextResponse.json(
      { error: "งานรอบนี้มีอยู่แล้วในระบบ" },
      { status: 409 }
    );
  }

  const rule = getRuleByTaxForm(task.taxType.name);
  const ruleUsed = rule
    ? `${rule.ruleCode}: ${task.taxType.name} — ${rule.name}`
    : task.taxType.name;

  const newTask = createTask({
    clientId: task.clientId,
    client: task.client,
    taxTypeId: task.taxTypeId,
    taxType: task.taxType,
    assignedUserId: task.assignedUserId,
    assignedUser: task.assignedUser,
    fiscalYearEndDate: nextFYE,
    dueDate: dueDate.toISOString(),
    ruleUsed,
    status: "TODO",
    priority: task.priority ?? "MEDIUM",
    mddScore: task.mddScore ?? 50,
  });

  return NextResponse.json({ data: newTask }, { status: 201 });
}
