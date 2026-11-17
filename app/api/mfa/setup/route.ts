import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secretBox";
import { generateTotpSecret, otpauthUrl } from "@/lib/totp";

/**
 * Start 2FA enrolment (FR-109): a fresh secret is stored encrypted, not yet active; it becomes
 * active only after /api/mfa/verify accepts a code from the phone. Already-enrolled accounts must
 * be reset by a supervisor first, so a stolen session can't silently move 2FA to another phone.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, totpEnabledAt: true, totpSecretEnc: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.totpEnabledAt) {
    return NextResponse.json({ error: "บัญชีนี้ตั้งค่ายืนยันตัวตนสองชั้นแล้ว" }, { status: 409 });
  }

  // Reuse a pending (not yet confirmed) secret so reloading the page doesn't invalidate a QR
  // that was already scanned
  let secret: string;
  if (user.totpSecretEnc) {
    secret = decryptSecret(user.totpSecretEnc);
  } else {
    secret = generateTotpSecret();
    await prisma.user.update({ where: { id: session.user.id }, data: { totpSecretEnc: encryptSecret(secret) } });
  }
  const url = otpauthUrl(secret, user.email);
  return NextResponse.json({
    data: { qrDataUrl: await QRCode.toDataURL(url, { margin: 1, width: 220 }), secret },
  });
}
