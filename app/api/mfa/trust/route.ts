import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withTrustedDeviceCookie } from "@/lib/mfaCookie";

/** After a login with a 2FA code: remember this browser for 30 days. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.mfa !== "ok") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { totpEnabledAt: true } });
  if (!user?.totpEnabledAt) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่ายืนยันตัวตนสองชั้น" }, { status: 409 });
  return withTrustedDeviceCookie(NextResponse.json({ data: { trusted: true } }), session.user.id, user.totpEnabledAt);
}
