import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TaxCalendar } from "@/components/calendar/TaxCalendar";
import { findTasksFromDb } from "@/lib/repositories/tasks";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "";
  const isSupervisor = session?.user?.role === "SUPERVISOR";

  const tasks = await findTasksFromDb({ isSupervisor, userId });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">ปฏิทินภาษี</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ดูวันครบกำหนดยื่นภาษีในรูปแบบปฏิทิน
        </p>
      </div>
      <TaxCalendar tasks={tasks} isSupervisor={isSupervisor} />
    </div>
  );
}
