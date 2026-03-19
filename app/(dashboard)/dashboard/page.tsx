import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTasks, getTasksByUser, MOCK_USERS } from "@/data/mockData";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { WorkloadChart } from "@/components/dashboard/WorkloadChart";
import { TaskStatusChart } from "@/components/dashboard/TaskStatusChart";
import { formatThaiDate, daysUntil } from "@/lib/utils";
import { Task, DashboardStats, WorkloadData } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardYearFilter } from "@/components/dashboard/DashboardYearFilter";

interface DashboardPageProps {
  searchParams: { year?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "";
  const isSupervisor = session?.user?.role === "SUPERVISOR";

  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams.year
    ? Number(searchParams.year)
    : currentYear;

  const allTasks: Task[] = isSupervisor
    ? getAllTasks()
    : getTasksByUser(userId);

  // Filter by year
  const filteredTasks = allTasks.filter((t) => {
    const taskYear = new Date(t.dueDate).getFullYear();
    return taskYear === selectedYear;
  });

  const now = new Date();

  const submittedTasks = filteredTasks.filter((t) => t.status === "SUBMITTED").length;
  const processingTasks = filteredTasks.filter((t) => t.status === "PROCESSING").length;
  const overdueTasks = filteredTasks.filter(
    (t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now
  ).length;

  const stats: DashboardStats = {
    totalTasks: filteredTasks.length,
    submittedTasks,
    processingTasks,
    overdueTasks,
    todoTasks: filteredTasks.filter((t) => t.status === "TODO").length,
  };

  const statusChartData = [
    { name: "รอดำเนินการ", value: stats.todoTasks, color: "#94A3B8" },
    { name: "กำลังดำเนินการ", value: stats.processingTasks, color: "#F59E0B" },
    { name: "ยื่นแล้ว", value: stats.submittedTasks, color: "#10B981" },
    { name: "เกินกำหนด", value: stats.overdueTasks, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  const workloadData: WorkloadData[] = isSupervisor
    ? MOCK_USERS.filter((u) => u.role === "STAFF").map((user) => {
        const userTasks = filteredTasks.filter(
          (t) => t.assignedUserId === user.id
        );
        const firstName = user.name.split(" ")[0];
        return {
          name: firstName,
          todo: userTasks.filter((t) => t.status === "TODO").length,
          processing: userTasks.filter((t) => t.status === "PROCESSING").length,
          submitted: userTasks.filter((t) => t.status === "SUBMITTED").length,
        };
      })
    : [];

  const overduelist = filteredTasks
    .filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now)
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    .slice(0, 5);

  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            ภาพรวมระบบ
            {!isSupervisor && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (แสดงเฉพาะงานของคุณ)
              </span>
            )}
          </h2>
        </div>
        <DashboardYearFilter
          currentYear={selectedYear}
          yearOptions={yearOptions}
        />
      </div>

      <StatsCards stats={stats} />

      <div
        className={
          isSupervisor
            ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
            : "grid grid-cols-1 gap-4"
        }
      >
        <TaskStatusChart data={statusChartData} />
        {isSupervisor && <WorkloadChart data={workloadData} />}
      </div>

      {overduelist.length > 0 && (
        <Card className="shadow-sm border-red-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
              งานเกินกำหนด ({overduelist.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-red-50/50">
                  <TableHead className="pl-6">ผู้ประกอบการ</TableHead>
                  <TableHead>ประเภทภาษี</TableHead>
                  <TableHead>ผู้รับผิดชอบ</TableHead>
                  <TableHead>ครบกำหนด</TableHead>
                  <TableHead className="text-right pr-6">เกินมา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduelist.map((task) => {
                  const days = Math.abs(daysUntil(task.dueDate));
                  return (
                    <TableRow key={task.id} className="hover:bg-red-50/30">
                      <TableCell className="pl-6 font-medium text-sm">
                        {task.client.companyName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.taxType.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.assignedUser.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatThaiDate(task.dueDate)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="destructive" className="text-xs">
                          {days} วัน
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {overduelist.length === 0 && (
        <Card className="shadow-sm border-emerald-100">
          <CardContent className="py-8 text-center">
            <p className="text-emerald-600 font-medium">
              ไม่มีงานที่เกินกำหนด 🎉
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
