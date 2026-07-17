import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  getUserByIdForAuth,
  getUserByIdFromDb,
  updateUserNameInDb,
  updateUserPasswordInDb,
  clearUserLineUserIdInDb,
} from "@/lib/repositories/users";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getUserByIdFromDb(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }
  return NextResponse.json({ lineUserId: user.lineUserId ?? null });
}

const profilePatchSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณาระบุชื่อ").max(120, "ชื่อต้องไม่เกิน 120 ตัวอักษร").optional(),
    currentPassword: z.string().min(1, "กรุณาระบุรหัสผ่านปัจจุบัน").optional(),
    newPassword: z
      .string()
      .min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")
      .max(128, "รหัสผ่านใหม่ต้องไม่เกิน 128 ตัวอักษร")
      .optional(),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const { name, currentPassword, newPassword } = parsed.data;
  const user = await getUserByIdForAuth(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  if (name && !currentPassword && !newPassword) {
    await updateUserNameInDb(user.id, name);
    return NextResponse.json({ message: "อัปเดตชื่อเรียบร้อยแล้ว" });
  }

  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await updateUserPasswordInDb(user.id, hashed);
    return NextResponse.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
  }

  return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await clearUserLineUserIdInDb(session.user.id);
  return NextResponse.json({ message: "ยกเลิกการเชื่อมต่อ LINE เรียบร้อยแล้ว" });
}
