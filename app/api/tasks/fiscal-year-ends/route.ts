import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/tasks/fiscal-year-ends
// Returns distinct DD/MM values from clients that have tasks
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    where: { tasks: { some: {} } },
    select: { fiscalYearEndDay: true, fiscalYearEnd: true },
    distinct: ["fiscalYearEndDay", "fiscalYearEnd"],
    orderBy: [{ fiscalYearEnd: "asc" }, { fiscalYearEndDay: "asc" }],
  });

  const values = clients.map((c) => ({
    value: `${String(c.fiscalYearEndDay).padStart(2, "0")}/${String(c.fiscalYearEnd).padStart(2, "0")}`,
    day: c.fiscalYearEndDay,
    month: c.fiscalYearEnd,
  }));

  return NextResponse.json({ data: values });
}
