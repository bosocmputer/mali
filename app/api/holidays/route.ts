import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createHolidayInDb,
  deleteHolidayFromDb,
  DuplicateHolidayDateError,
  getAllHolidaysFromDb,
  parseHolidayDate,
} from "@/lib/repositories/holidays";

const holidaySchema = z.object({
  date: z.string().refine((date) => parseHolidayDate(date) !== null, {
    message: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD",
  }),
  name_th: z.string().trim().min(1),
  name_en: z.string().trim().min(1),
  type: z.enum([
    "public_holiday",
    "special_holiday",
    "government_holiday",
    "substitution_holiday",
  ]),
  is_substitution: z.coerce.boolean().optional(),
  note: z.string().nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await getAllHolidaysFromDb() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = holidaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "date, name_th, name_en, type จำเป็นต้องระบุ" }, { status: 400 });
  }

  const { date, name_th, name_en, type, is_substitution, note } = parsed.data;
  try {
    const holiday = await createHolidayInDb({
      date,
      name_th,
      name_en,
      type,
      is_substitution: Boolean(is_substitution),
      note: note ?? null,
    });

    return NextResponse.json({ data: holiday }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateHolidayDateError) {
      return NextResponse.json({ error: "มีวันหยุดวันที่นี้อยู่แล้ว" }, { status: 409 });
    }
    throw error;
  }
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

  const deleted = await deleteHolidayFromDb(id);
  if (!deleted) return NextResponse.json({ error: "ไม่พบวันหยุด" }, { status: 404 });

  return NextResponse.json({ message: "ลบเรียบร้อย" });
}
