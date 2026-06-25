import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const THAI_HOLIDAY_CALENDAR = "th.th%23holiday%40group.v.calendar.google.com";
const OFFICIAL_KEYWORD = "วันหยุดนักขัตฤกษ์";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  if (isNaN(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "ปีไม่ถูกต้อง" }, { status: 400 });
  }

  const timeMin = encodeURIComponent(`${year}-01-01T00:00:00Z`);
  const timeMax = encodeURIComponent(`${year}-12-31T23:59:59Z`);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${THAI_HOLIDAY_CALENDAR}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`;

  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Google Calendar API error: ${res.status}`, detail: text },
      { status: 502 }
    );
  }

  const data = await res.json();
  const items: { date: string; name_th: string; name_en: string }[] = [];

  for (const event of data.items ?? []) {
    const description: string = event.description ?? "";
    // เอาเฉพาะวันหยุดราชการ
    if (!description.startsWith(OFFICIAL_KEYWORD)) continue;

    const date: string = event.start?.date;
    if (!date) continue;

    items.push({
      date,
      name_th: event.summary ?? "",
      name_en: event.summary ?? "", // Google TH calendar ไม่มี EN — ใช้ชื่อเดียวกัน
    });
  }

  return NextResponse.json({ year, items });
}
