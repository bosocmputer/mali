import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllHolidays, createHoliday, deleteHoliday } from "@/data/mockData";
import { ThaiHoliday } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: getAllHolidays() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { date, name_th, name_en, type, is_substitution, note } = body;

  if (!date || !name_th || !name_en || !type) {
    return NextResponse.json({ error: "date, name_th, name_en, type จำเป็นต้องระบุ" }, { status: 400 });
  }

  // validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD" }, { status: 400 });
  }

  const holiday = createHoliday({
    date,
    name_th,
    name_en,
    type: type as ThaiHoliday["type"],
    is_substitution: Boolean(is_substitution),
    note: note ?? null,
  });

  return NextResponse.json({ data: holiday }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id จำเป็นต้องระบุ" }, { status: 400 });

  const deleted = deleteHoliday(id);
  if (!deleted) return NextResponse.json({ error: "ไม่พบวันหยุด" }, { status: 404 });

  return NextResponse.json({ message: "ลบเรียบร้อย" });
}
