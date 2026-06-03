import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { parseHolidayDate, syncHolidaysToDb } from "@/lib/repositories/holidays";

const syncHolidaySchema = z.object({
  items: z
    .array(
      z.object({
        date: z.string().refine((date) => parseHolidayDate(date) !== null),
        name_th: z.string().trim().min(1),
        name_en: z.string().trim().min(1),
      })
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = syncHolidaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "รายการวันหยุดไม่ถูกต้อง" }, { status: 400 });
  }

  const added = await syncHolidaysToDb(parsed.data.items);
  return NextResponse.json({ message: `Sync สำเร็จ`, added });
}
