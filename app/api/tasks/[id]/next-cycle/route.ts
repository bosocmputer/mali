import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createNextCycleTaskFromDb,
  DuplicateTaskError,
  getTaskByIdFromDb,
  previewNextCycleFromDb,
} from "@/lib/repositories/tasks";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await getTaskByIdFromDb(params.id);
  if (!task) return NextResponse.json({ error: "ไม่พบงาน" }, { status: 404 });
  if (session.user.role === "STAFF" && task.assignedUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await previewNextCycleFromDb(params.id);
    if (!data) return NextResponse.json({ error: "ไม่พบงาน" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("No rule found")) {
      return NextResponse.json({ error: "ไม่มีกฎสำหรับประเภทภาษีนี้" }, { status: 400 });
    }
    throw error;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden — เฉพาะ Supervisor เท่านั้น" }, { status: 403 });
  }

  try {
    const data = await createNextCycleTaskFromDb(params.id);
    if (!data) return NextResponse.json({ error: "ไม่พบงาน" }, { status: 404 });
    return NextResponse.json({ data }, { status: 201 });
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
