import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllTeams, MOCK_USERS } from "@/data/mockData";
import { TeamTable } from "@/components/teams/TeamTable";
import { Users } from "lucide-react";

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");

  const teams = getAllTeams();
  const users = MOCK_USERS;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">จัดการทีม</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          กำหนดทีมและหัวหน้าทีม — หัวหน้าทีมจะได้รับการแจ้งเตือน escalation เมื่องานใกล้ครบกำหนด (D-1)
        </p>
      </div>
      <TeamTable teams={teams} users={users} />
    </div>
  );
}
