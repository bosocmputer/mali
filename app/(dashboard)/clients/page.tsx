import { getAllClients, getAllTeams, getAllUsers } from "@/data/mockData";
import { ClientTable } from "@/components/clients/ClientTable";

export default function ClientsPage() {
  const clients = getAllClients();
  const teams = getAllTeams();
  const staffUsers = getAllUsers();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          ผู้ประกอบการ
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          จัดการข้อมูลผู้ประกอบการและประเภทภาษี
        </p>
      </div>
      <ClientTable clients={clients} teams={teams} staffUsers={staffUsers} />
    </div>
  );
}
