import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("summary") === "1") {
    const newCount = await prisma.webInquiry.count({ where: { status: "NEW" } });
    return NextResponse.json({ newCount });
  }

  const status = url.searchParams.get("status");
  const where = status === "NEW" || status === "CONTACTED" ? { status } : undefined;

  const [items, newCount] = await Promise.all([
    prisma.webInquiry.findMany({
      where,
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
      include: {
        contactedBy: { select: { id: true, name: true } },
      },
      take: 200,
    }),
    prisma.webInquiry.count({ where: { status: "NEW" } }),
  ]);

  return NextResponse.json({ data: items, newCount });
}
