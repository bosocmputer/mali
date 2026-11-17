import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseTaskQuery } from "@/lib/taskQuery";
import { createTaskInDb, DuplicateTaskError, findTasksFromDb } from "@/lib/repositories/tasks";
import { z } from "zod";

const createTaskSchema = z.object({
  clientId: z.string().min(1),
  taxTypeId: z.string().min(1),
  assignedUserId: z.string().min(1),
  fiscalYearEndDate: z.coerce.date(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await findTasksFromDb(
    parseTaskQuery(new URL(req.url).searchParams, { id: session.user.id, role: session.user.role })
  );

  return NextResponse.json({ data: tasks });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden — เฉพาะ Supervisor เท่านั้น" }, { status: 403 });
  }

  const parsed = createTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "clientId, taxTypeId, assignedUserId, fiscalYearEndDate จำเป็นต้องระบุ" },
      { status: 400 }
    );
  }

  try {
    const task = await createTaskInDb(parsed.data);
    if (!task) {
      return NextResponse.json({ error: "ข้อมูลอ้างอิงไม่ถูกต้อง" }, { status: 404 });
    }

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateTaskError) {
      return NextResponse.json({ error: "งานรอบนี้มีอยู่แล้วในระบบ" }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("No rule found")) {
      return NextResponse.json({ error: "ไม่มีกฎสำหรับประเภทภาษีนี้" }, { status: 400 });
    }
    throw error;
  }
}
