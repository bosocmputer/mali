import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * FR-109: a supervisor resets someone's 2FA (new phone). They enrol again at next login, and
 * every device remembered under the old enrolment stops being trusted.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { count } = await prisma.user.updateMany({
    where: { id: params.id },
    data: { totpSecretEnc: null, totpEnabledAt: null },
  });
  if (count === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ data: { reset: true } });
}
