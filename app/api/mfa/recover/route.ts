import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendLineMessage } from "@/lib/lineClient";
import { generateRecoveryCode, hashRecoveryCode, RECOVERY_RESEND_MS, RECOVERY_TTL_MS } from "@/lib/mfaRecovery";

/**
 * Lost or changed phone: after the password checks out, send a one-time code to the LINE account
 * linked to this user. Signing in with that code clears 2FA so the person scans a new QR.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const wrong = NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  if (!email || !password) return wrong;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    select: { id: true, password: true, lineUserId: true, totpEnabledAt: true, mfaRecoveryExpiresAt: true },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) return wrong;
  if (!user.totpEnabledAt) {
    return NextResponse.json({ error: "บัญชีนี้ยังไม่ได้ตั้งค่ายืนยันตัวตน — เข้าสู่ระบบได้เลย แล้วสแกน QR" }, { status: 409 });
  }
  if (!user.lineUserId) {
    return NextResponse.json({ error: "บัญชีนี้ยังไม่ได้เชื่อม LINE — ติดต่อผู้จัดการให้รีเซ็ตยืนยันตัวตน" }, { status: 409 });
  }
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json({ error: "ระบบนี้ส่ง LINE ไม่ได้ — ติดต่อผู้จัดการให้รีเซ็ตยืนยันตัวตน" }, { status: 503 });
  }
  // one code a minute
  const sentAt = user.mfaRecoveryExpiresAt ? user.mfaRecoveryExpiresAt.getTime() - RECOVERY_TTL_MS : 0;
  if (Date.now() - sentAt < RECOVERY_RESEND_MS) {
    return NextResponse.json({ error: "เพิ่งส่งรหัสไปแล้ว — รอ 1 นาทีแล้วลองใหม่" }, { status: 429 });
  }

  const code = generateRecoveryCode();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaRecoveryHash: hashRecoveryCode(user.id, code),
      mfaRecoveryExpiresAt: new Date(Date.now() + RECOVERY_TTL_MS),
      mfaRecoveryAttempts: 0,
    },
  });
  try {
    await sendLineMessage(
      user.lineUserId,
      `🔐 รหัสกู้คืน MALI: ${code}\nใช้ได้ 10 นาที สำหรับตั้งค่าแอปยืนยันตัวตนใหม่\nถ้าไม่ได้ขอรหัสนี้ แจ้งผู้จัดการทันที`
    );
  } catch {
    await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryHash: null, mfaRecoveryExpiresAt: null } });
    return NextResponse.json({ error: "ส่ง LINE ไม่สำเร็จ ลองใหม่อีกครั้ง หรือติดต่อผู้จัดการ" }, { status: 502 });
  }
  return NextResponse.json({ data: { sent: true } });
}
