import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/secretBox";
import { verifyTotp } from "@/lib/totp";
import { withTrustedDeviceCookie } from "@/lib/mfaCookie";

/** Finish enrolment: the first correct code activates 2FA. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecretEnc: true, totpEnabledAt: true },
  });
  if (!user?.totpSecretEnc || user.totpEnabledAt) {
    return NextResponse.json({ error: "กรุณาเริ่มตั้งค่าใหม่" }, { status: 409 });
  }
  if (typeof body.code !== "string" || !verifyTotp(decryptSecret(user.totpSecretEnc), body.code)) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง (รหัสเปลี่ยนทุก 30 วินาที)" }, { status: 400 });
  }

  const enabledAt = new Date();
  await prisma.user.update({ where: { id: session.user.id }, data: { totpEnabledAt: enabledAt } });
  const res = NextResponse.json({ data: { enabled: true } });
  return body.remember ? withTrustedDeviceCookie(res, session.user.id, enabledAt) : res;
}
