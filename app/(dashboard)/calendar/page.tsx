import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTasks, getTasksByUser } from "@/data/mockData";
import { TaxCalendar } from "@/components/calendar/TaxCalendar";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "";
  const isSupervisor = session?.user?.role === "SUPERVISOR";

  const tasks = isSupervisor ? getAllTasks() : getTasksByUser(userId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">ปฏิทินภาษี</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ดูวันครบกำหนดยื่นภาษีในรูปแบบปฏิทิน
        </p>
      </div>
      <TaxCalendar tasks={tasks} />
    </div>
  );
}
