import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { buildFlexMessage, sendLineMessage } from "@/lib/cronNotify";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserByIdFromDb(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.lineUserId) {
    return NextResponse.json(
      { error: "ยังไม่ได้เชื่อมต่อ LINE — กรุณาเชื่อมต่อก่อน" },
      { status: 400 }
    );
  }

  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "ระบบยังไม่ได้ตั้งค่า LINE Channel Access Token" },
      { status: 503 }
    );
  }

  // ส่ง Flex Message ตัวอย่างเหมือนกับที่ cron ส่งจริง
  const sampleTasks = [
    { taxType: "ภ.ง.ด.1", company: "บริษัท ตัวอย่าง จำกัด", dueDate: new Date(Date.now() + 7 * 86400_000).toISOString() },
    { taxType: "ภ.พ.30", company: "ห้างหุ้นส่วน ABC", dueDate: new Date(Date.now() + 7 * 86400_000).toISOString() },
  ];

  try {
    const flex = buildFlexMessage("REMINDER", sampleTasks, 7);
    await sendLineMessage(user.lineUserId, flex);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `ส่งข้อความไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
}
