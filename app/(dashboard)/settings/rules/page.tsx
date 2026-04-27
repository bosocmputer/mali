import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllRules } from "@/data/mockData";
import { RuleTable } from "@/components/rules/RuleTable";
import { BookOpen } from "lucide-react";

export default async function RulesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") redirect("/dashboard");

  const rules = getAllRules();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">กฎการคำนวณ Due Date</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          จัดการกฎที่ใช้คำนวณวันครบกำหนด — งานที่สร้างแล้วไม่ถูกกระทบ
        </p>
      </div>
      <RuleTable rules={rules} />
    </div>
  );
}
