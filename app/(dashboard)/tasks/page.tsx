import { Suspense } from "react";
import { TaskTable } from "@/components/tasks/TaskTable";
import { getStaffUsersFromDb } from "@/lib/repositories/users";
import { Skeleton } from "@/components/ui/skeleton";

export default async function TasksPage() {
  const staffUsers = await getStaffUsersFromDb();

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <TaskTable staffUsers={staffUsers} />
    </Suspense>
  );
}
