import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(220).optional(),
  excerpt: z.string().trim().min(1).max(600).optional(),
  content: z.string().trim().min(1).max(30000).optional(),
  coverUrl: z.string().trim().max(500).nullish(),
  authorName: z.string().trim().max(120).optional(),
  isPublished: z.boolean().optional(),
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

  const updated = await prisma.webArticle.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.excerpt !== undefined && { excerpt: parsed.data.excerpt }),
      ...(parsed.data.content !== undefined && { content: parsed.data.content }),
      ...(parsed.data.coverUrl !== undefined && { coverUrl: parsed.data.coverUrl || null }),
      ...(parsed.data.authorName !== undefined && { authorName: parsed.data.authorName }),
      ...(parsed.data.isPublished !== undefined && { isPublished: parsed.data.isPublished }),
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

  await prisma.webArticle.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
