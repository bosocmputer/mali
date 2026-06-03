import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLineLinkTokenForUser } from "@/lib/repositories/lineLinks";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await createLineLinkTokenForUser(session.user.id);
  return NextResponse.json({
    message: "สร้างโค้ดเชื่อม LINE สำเร็จ",
    data: {
      token: token.token,
      expiresAt: token.expiresAt,
      instruction: `ส่งข้อความ "MALI ${token.token}" ไปที่ LINE OA ภายใน 10 นาที`,
    },
  });
}
