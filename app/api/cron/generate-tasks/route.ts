import { NextRequest, NextResponse } from "next/server";
import { generateAllTasks } from "@/lib/taskGenerator";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-cron-secret");
  if (!auth || auth !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = generateAllTasks();
  return NextResponse.json({
    message: `สร้างงานใหม่ ${result.created} งาน (ข้าม ${result.skipped} งานที่มีอยู่แล้ว)`,
    ...result,
  });
}
