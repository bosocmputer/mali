import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTasks, getTasksByUser, getClientById, getUserById, createTask } from "@/data/mockData";
import { TaskStatus } from "@/types";
import { getDueDateByTaxType, TAX_RULE_BY_FORM } from "@/lib/ruleEngine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status = statusParam as TaskStatus | "OVERDUE" | null;
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
  const now = new Date();
  if (status === "OVERDUE") {
    tasks = tasks.filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now);
  } else if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (clientId) {
    tasks = tasks.filter((t) => t.clientId === clientId);
  }
  if (isSupervisor && assignedUserId) {
    tasks = tasks.filter((t) => t.assignedUserId === assignedUserId);
  }
  if (month) {
    const m = parseInt(month);
    const y = year ? parseInt(year) : null;
    tasks = tasks.filter((t) => {
      const due = new Date(t.dueDate);
      const monthMatch = due.getMonth() + 1 === m;
      const yearMatch = y === null || due.getFullYear() === y;
      return monthMatch && yearMatch;
    });
  } else if (year) {
    const y = parseInt(year);
    tasks = tasks.filter((t) => new Date(t.dueDate).getFullYear() === y);
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden — เฉพาะ Supervisor เท่านั้น" }, { status: 403 });
  }

  const body = await req.json();
  const { clientId, taxTypeId, assignedUserId, fiscalYearEndDate } = body;

  if (!clientId || !taxTypeId || !assignedUserId || !fiscalYearEndDate) {
    return NextResponse.json(
      { error: "clientId, taxTypeId, assignedUserId, fiscalYearEndDate จำเป็นต้องระบุ" },
      { status: 400 }
    );
  }

  const client = getClientById(clientId);
  if (!client) return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 404 });

  const taxType = client.taxTypes.find((t) => t.id === taxTypeId);
  if (!taxType) return NextResponse.json({ error: "ไม่พบประเภทภาษี" }, { status: 404 });

  const assignedUser = getUserById(assignedUserId);
  if (!assignedUser) return NextResponse.json({ error: "ไม่พบผู้รับผิดชอบ" }, { status: 404 });

  // คำนวณ dueDate จาก Rule Engine
  const baseDate = new Date(fiscalYearEndDate);
  const dueDate = getDueDateByTaxType(taxType.name, baseDate);
  if (!dueDate) {
    return NextResponse.json({ error: `ไม่มีกฎสำหรับ ${taxType.name}` }, { status: 400 });
  }

  const rule = TAX_RULE_BY_FORM[taxType.name];
  const ruleUsed = rule ? `${rule.ruleCode}: ${taxType.name} — ${rule.name}` : taxType.name;

  const task = createTask({
    clientId: client.id,
    client,
    taxTypeId: taxType.id,
    taxType,
    assignedUserId: assignedUser.id,
    assignedUser,
    fiscalYearEndDate,
    dueDate: dueDate.toISOString(),
    ruleUsed,
    status: "TODO",
    priority: "MEDIUM",
    mddScore: 50,
  });

  return NextResponse.json({ data: task }, { status: 201 });
}
