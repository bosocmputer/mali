import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPaymentSettings, savePaymentSettings } from "@/lib/repositories/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await getPaymentSettings() });
}

const schema = z.object({
  "payment.bankName": z.string().trim().max(100).optional(),
  "payment.accountNo": z.string().trim().max(50).optional(),
  "payment.accountName": z.string().trim().max(200).optional(),
  "payment.closing": z.string().trim().max(300).optional(),
});

/** FR-100: supervisors edit the transfer details and wording. */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  await savePaymentSettings(parsed.data);
  return NextResponse.json({ data: await getPaymentSettings() });
}
