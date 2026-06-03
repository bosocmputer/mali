import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDueDateByTaxTypeFromDb } from "@/lib/repositories/rules";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { taxTypeName, fiscalYearEndDate } = body;

  if (!taxTypeName || !fiscalYearEndDate) {
    return NextResponse.json({ error: "taxTypeName and fiscalYearEndDate required" }, { status: 400 });
  }

  const baseDate = new Date(fiscalYearEndDate);
  const dueDate = await getDueDateByTaxTypeFromDb(taxTypeName, baseDate);

  if (!dueDate) {
    return NextResponse.json({ error: `ไม่มีกฎสำหรับ ${taxTypeName}` }, { status: 400 });
  }

  return NextResponse.json({ dueDate: dueDate.toISOString() });
}
