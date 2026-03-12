import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createNotification, getTaskById } from "@/data/mockData";
import { NotificationType } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { taskId, type } = body;

  if (!taskId || !type) {
    return NextResponse.json(
      { error: "taskId and type are required" },
      { status: 400 }
    );
  }

  const task = getTaskById(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Phase 1: Log to in-memory store only — no actual LINE API call
  const log = createNotification({
    taskId,
    userId: session.user.id,
    type: type as NotificationType,
  });

  return NextResponse.json({
    data: log,
    message:
      "การแจ้งเตือนถูกบันทึกแล้ว (LINE ยังไม่เชื่อมต่อใน Phase 1)",
  });
}
