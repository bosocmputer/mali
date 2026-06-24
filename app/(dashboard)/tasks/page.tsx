import { Suspense } from "react";
import { TaskTable } from "@/components/tasks/TaskTable";
import { ClipboardList } from "lucide-react";
import { getStaffUsersFromDb } from "@/lib/repositories/users";
import { Skeleton } from "@/components/ui/skeleton";

export default async function TasksPage() {
  const staffUsers = await getStaffUsersFromDb();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">งาน</h2>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <TaskTable staffUsers={staffUsers} />
      </Suspense>
    </div>
  );
}
