import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleCorsPreflight, publicCorsHeaders } from "@/lib/publicCors";

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const headers = publicCorsHeaders(req);
  const article = await prisma.webArticle.findFirst({
    where: { slug: params.slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverUrl: true,
      authorName: true,
      publishedAt: true,
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  }
  return NextResponse.json({ data: article }, { headers });
}
