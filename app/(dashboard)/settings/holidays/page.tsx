import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllHolidays } from "@/data/mockData";
import { HolidayTable } from "@/components/holidays/HolidayTable";
import { CalendarDays } from "lucide-react";

export default async function HolidaysPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");

  const holidays = getAllHolidays();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">วันหยุดนักขัตฤกษ์</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          จัดการวันหยุดราชการ — ระบบจะเลื่อนวันครบกำหนดที่ตรงกับวันหยุดไปเป็นวันทำงานถัดไปอัตโนมัติ
        </p>
      </div>
      <HolidayTable holidays={holidays} />
    </div>
  );
}
