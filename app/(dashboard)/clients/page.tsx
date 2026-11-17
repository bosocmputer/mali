import { ClientTable } from "@/components/clients/ClientTable";
import { isClosedStatus } from "@/lib/taskWorkflow";
import { Building2 } from "lucide-react";
import { Task } from "@/types";
import { getClientsPageData } from "@/lib/repositories/clients";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLedTeamScope } from "@/lib/repositories/tasks";
import { canEditClientWithScope } from "@/lib/clientAccess";
import { countNotesByClientForUser } from "@/lib/repositories/notes";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  const { clients, teams, staffUsers, allTasks } = await getClientsPageData();

  // Which companies this person may edit (the API checks the same rule)
  const scope = session ? await getLedTeamScope(session.user.id) : { teamIds: [], memberIds: [] };
  const editableIds = session
    ? clients.filter((c) => canEditClientWithScope(session.user, c, scope)).map((c) => c.id)
    : [];
  const noteCountMap = session ? await countNotesByClientForUser(session.user.id) : {};

  const taskCountMap: Record<string, number> = {};
  const pendingTasksMap: Record<string, Task[]> = {};
  for (const task of allTasks) {
    if (!isClosedStatus(task.status)) {
      taskCountMap[task.clientId] = (taskCountMap[task.clientId] ?? 0) + 1;
      if (!pendingTasksMap[task.clientId]) pendingTasksMap[task.clientId] = [];
      pendingTasksMap[task.clientId].push(task);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">ข้อมูลบริษัท/ห้างหุ้นส่วนฯ</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          จัดการข้อมูลบริษัท/ห้างหุ้นส่วนฯและประเภทภาษี
        </p>
      </div>
      <ClientTable
        clients={clients}
        teams={teams}
        staffUsers={staffUsers}
        taskCountMap={taskCountMap}
        pendingTasksMap={pendingTasksMap}
        editableIds={editableIds}
        noteCountMap={noteCountMap}
      />
    </div>
  );
}
