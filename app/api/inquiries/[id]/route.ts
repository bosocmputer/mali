import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["NEW", "CONTACTED"]).optional(),
  staffNote: z.string().trim().max(1000).nullish(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const existing = await prisma.webInquiry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });

  const nextStatus = parsed.data.status ?? existing.status;
  const updated = await prisma.webInquiry.update({
    where: { id: params.id },
    data: {
      status: nextStatus,
      staffNote: parsed.data.staffNote !== undefined ? parsed.data.staffNote : existing.staffNote,
      contactedById: nextStatus === "CONTACTED" ? session.user.id : null,
      contactedAt: nextStatus === "CONTACTED" ? new Date() : null,
    },
    include: {
      contactedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.webInquiry.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
