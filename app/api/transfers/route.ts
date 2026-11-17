import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listClientsOfStaff, transferWorkInDb } from "@/lib/repositories/clients";
import { notifyWorkTransferred } from "@/lib/workflowNotify";

/** Companies of one person, to choose what to transfer (FR-104). */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const from = new URL(req.url).searchParams.get("from");
  if (!from) return NextResponse.json({ error: "from is required" }, { status: 400 });
  return NextResponse.json({ data: await listClientsOfStaff(from) });
}

const schema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  clientIds: z.array(z.string().min(1)).min(1, "กรุณาเลือกบริษัทอย่างน้อย 1 แห่ง").max(500),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { fromUserId, toUserId } = parsed.data;
  if (fromUserId === toUserId) return NextResponse.json({ error: "เลือกผู้รับโอนคนอื่น" }, { status: 400 });

  const [from, to] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: toUserId }, select: { name: true, isActive: true } }),
  ]);
  if (!from || !to) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  if (!to.isActive) return NextResponse.json({ error: "ผู้รับโอนถูกปิดใช้งาน" }, { status: 400 });

  const result = await transferWorkInDb({ ...parsed.data, changedById: session.user.id });
  await notifyWorkTransferred(toUserId, from.name, result);
  return NextResponse.json({ data: result });
}
