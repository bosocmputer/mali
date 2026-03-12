import { MOCK_USERS } from "@/data/mockData";
import { TaskTable } from "@/components/tasks/TaskTable";
import { User } from "@/types";

export default function TasksPage() {
  const staffUsers: User[] = MOCK_USERS.filter((u) => u.role === "STAFF");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">งาน</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ติดตามและจัดการงานยื่นภาษีทั้งหมด
        </p>
      </div>
      <TaskTable staffUsers={staffUsers} />
    </div>
  );
}
