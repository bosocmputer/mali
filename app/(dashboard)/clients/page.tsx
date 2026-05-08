import { getAllClients, getAllTeams, getAllUsers, getAllTasks } from "@/data/mockData";
import { ClientTable } from "@/components/clients/ClientTable";
import { Building2 } from "lucide-react";

export default function ClientsPage() {
  const clients = getAllClients();
  const teams = getAllTeams();
  const staffUsers = getAllUsers();
  const allTasks = getAllTasks();

  // count active (non-submitted) tasks per client
  const taskCountMap: Record<string, number> = {};
  for (const task of allTasks) {
    if (task.status !== "SUBMITTED") {
      taskCountMap[task.clientId] = (taskCountMap[task.clientId] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">ผู้ประกอบการ</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          จัดการข้อมูลผู้ประกอบการและประเภทภาษี
        </p>
      </div>
      <ClientTable clients={clients} teams={teams} staffUsers={staffUsers} taskCountMap={taskCountMap} />
    </div>
  );
}
