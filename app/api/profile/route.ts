import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { getUserById, updateUser } from "@/data/mockData";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, currentPassword, newPassword } = body;

  const user = getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  // Update name only
  if (name && !currentPassword) {
    updateUser(user.id, { name });
    return NextResponse.json({ message: "อัปเดตชื่อเรียบร้อยแล้ว" });
  }

  // Change password
  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    updateUser(user.id, { password: hashed });
    return NextResponse.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
  }

  return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
}
