import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const articleSchema = z.object({
  title: z.string().trim().min(1, "กรุณากรอกหัวข้อบทความ").max(220),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().min(1, "กรุณากรอกสรุปย่อ").max(600),
  content: z.string().trim().min(1, "กรุณากรอกเนื้อหาบทความ").max(30000),
  coverUrl: z.string().trim().max(500).nullish(),
  authorName: z.string().trim().max(120).optional(),
  isPublished: z.boolean().optional().default(true),
});

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return base || `article-${Date.now()}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const articles = await prisma.webArticle.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json({ data: articles });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = articleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  let slug = slugify(parsed.data.slug || parsed.data.title);
  const dup = await prisma.webArticle.findUnique({ where: { slug } });
  if (dup) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const created = await prisma.webArticle.create({
    data: {
      id: randomUUID(),
      slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      coverUrl: parsed.data.coverUrl || null,
      authorName: parsed.data.authorName || session.user.name || "ทีมงาน HASH-TAX",
      isPublished: parsed.data.isPublished,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
