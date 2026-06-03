import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { UserRoundCog } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getAllUsersFromDb } from "@/lib/repositories/users";
import { UserTable } from "@/components/users/UserTable";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");

  const users = await getAllUsersFromDb();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <UserRoundCog className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">จัดการผู้ใช้</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          เพิ่มผู้ใช้ กำหนดบทบาท และจัดการสถานะการเข้าใช้งาน
        </p>
      </div>
      <UserTable users={users} currentUserId={session.user.id} />
    </div>
  );
}
