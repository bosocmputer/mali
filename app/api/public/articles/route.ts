import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleCorsPreflight, publicCorsHeaders } from "@/lib/publicCors";

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest) {
  const headers = publicCorsHeaders(req);
  const articles = await prisma.webArticle.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      authorName: true,
      publishedAt: true,
    },
    take: 50,
  });

  return NextResponse.json({ data: articles }, { headers });
}
