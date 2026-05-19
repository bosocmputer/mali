import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createHoliday, getAllHolidays } from "@/data/mockData";
import { ThaiHoliday } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const items: { date: string; name_th: string; name_en: string }[] = body.items ?? [];

  const existing = new Set(getAllHolidays().map((h) => h.date));
  let added = 0;

  for (const item of items) {
    if (existing.has(item.date)) continue;
    createHoliday({
      date: item.date,
      name_th: item.name_th,
      name_en: item.name_en,
      type: "public_holiday" as ThaiHoliday["type"],
      is_substitution: false,
      note: null,
    });
    added++;
  }

  return NextResponse.json({ message: `Sync สำเร็จ`, added });
}
