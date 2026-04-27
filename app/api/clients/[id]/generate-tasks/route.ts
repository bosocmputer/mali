import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTasksForClient } from "@/lib/taskGenerator";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const result = generateTasksForClient(params.id, body.assignedUserId);

  if (result.created === 0 && result.skipped === 0 && result.errors.length > 0) {
    return NextResponse.json({ error: result.errors[0] }, { status: 404 });
  }

  return NextResponse.json({
    message: `สร้างงานใหม่ ${result.created} งาน (ข้าม ${result.skipped} งานที่มีอยู่แล้ว)`,
    ...result,
  });
}
