import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { WorkloadChart } from "@/components/dashboard/WorkloadChart";
import { UrgentTaskList } from "@/components/dashboard/UrgentTaskList";
import { MonthProgressCard } from "@/components/dashboard/MonthProgressCard";
import { MonthlyOverviewChart } from "@/components/dashboard/MonthlyOverviewChart";
import { DashboardYearFilter } from "@/components/dashboard/DashboardYearFilter";
import { Task, WorkloadData } from "@/types";
import { LayoutDashboard } from "lucide-react";
import { findTasksFromDb } from "@/lib/repositories/tasks";
import { getStaffUsersFromDb } from "@/lib/repositories/users";

interface DashboardPageProps {
  searchParams: { year?: string };
}

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "";
  const isSupervisor = session?.user?.role === "SUPERVISOR";
  const userName = session?.user?.name ?? "";
  const firstName = userName.split(" ")[0];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based
  const todayStr = now.toISOString().slice(0, 10);

  const selectedYear = searchParams.year ? Number(searchParams.year) : currentYear;
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const [allTasks, staffUsers]: [Task[], Awaited<ReturnType<typeof getStaffUsersFromDb>>] =
    await Promise.all([
      findTasksFromDb({ isSupervisor, userId }),
      getStaffUsersFromDb(),
    ]);

  // ── Urgent buckets (ไม่ filter year — งานค้างเก่าต้องแสดงด้วย) ───────────────
  const overdueTasks = allTasks
    .filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const todayTasks = allTasks
    .filter((t) => t.status !== "SUBMITTED" && t.dueDate.slice(0, 10) === todayStr);

  // Due within 7 days (ไม่นับ today และ overdue)
  const sevenDaysLater = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7));
  const dueSoonTasks = allTasks
    .filter((t) => {
      if (t.status === "SUBMITTED") return false;
      const due = new Date(t.dueDate);
      return due > now && due <= sevenDaysLater && t.dueDate.slice(0, 10) !== todayStr;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // ── Year-filtered tasks for stats ────────────────────────────────────────────
  const yearTasks = allTasks.filter(
    (t) => new Date(t.dueDate).getFullYear() === selectedYear
  );

  const stats = {
    totalTasks: yearTasks.length,
    submittedTasks: yearTasks.filter((t) => t.status === "SUBMITTED").length,
    processingTasks: yearTasks.filter((t) => t.status === "PROCESSING").length,
    todoTasks: yearTasks.filter((t) => t.status === "TODO").length,
    overdueTasks: overdueTasks.length,
    todayTasks: todayTasks.length,
    dueSoonTasks: dueSoonTasks.length,
  };

  // ── Month progress (current month, year-filtered) ─────────────────────────
  const monthTasks = yearTasks.filter(
    (t) => new Date(t.dueDate).getMonth() + 1 === currentMonth
  );
  const monthSubmitted  = monthTasks.filter((t) => t.status === "SUBMITTED").length;
  const monthProcessing = monthTasks.filter((t) => t.status === "PROCESSING").length;
  const monthTodo       = monthTasks.filter((t) => t.status === "TODO" && new Date(t.dueDate) >= now).length;
  const monthOverdue    = monthTasks.filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now).length;
  const monthLabel = `${THAI_MONTHS[currentMonth - 1]} ${selectedYear + 543}`;

  // ── Monthly overview ──────────────────────────────────────────────────────
  // Supervisor: 12 เดือนของปีที่เลือก
  // Staff: rolling 12 เดือนจากเดือนปัจจุบัน (ข้ามปีได้) ใช้ allTasks ไม่ใช่ yearTasks
  const monthlyData = isSupervisor
    ? Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const mt = yearTasks.filter((t) => new Date(t.dueDate).getMonth() + 1 === m);
        return {
          month: m,
          year: selectedYear,
          submitted:  mt.filter((t) => t.status === "SUBMITTED").length,
          processing: mt.filter((t) => t.status === "PROCESSING").length,
          todo:       mt.filter((t) => t.status === "TODO" && new Date(t.dueDate) >= now).length,
          overdue:    mt.filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now).length,
        };
      })
    : Array.from({ length: 12 }, (_, i) => {
        // rolling: เริ่มจากเดือนก่อน 1 เดือน
        const offset = i - 1;
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
        const m = d.getUTCMonth() + 1;
        const y = d.getUTCFullYear();
        const mt = allTasks.filter((t) => {
          const due = new Date(t.dueDate);
          return due.getUTCFullYear() === y && due.getUTCMonth() + 1 === m;
        });
        return {
          month: m,
          year: y,
          submitted:  mt.filter((t) => t.status === "SUBMITTED").length,
          processing: mt.filter((t) => t.status === "PROCESSING").length,
          todo:       mt.filter((t) => t.status === "TODO" && new Date(t.dueDate) >= now).length,
          overdue:    mt.filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now).length,
        };
      });

  // ── Workload (Supervisor only) ────────────────────────────────────────────
  const workloadData: WorkloadData[] = isSupervisor
    ? staffUsers.map((user) => {
        const userTasks = yearTasks.filter((t) => t.assignedUserId === user.id);
        return {
          name: user.name.split(" ")[0],
          submitted: userTasks.filter((t) => t.status === "SUBMITTED").length,
          processing: userTasks.filter((t) => t.status === "PROCESSING").length,
          todo: userTasks.filter((t) => t.status === "TODO" && new Date(t.dueDate) >= now).length,
          overdue: userTasks.filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now).length,
        };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              สวัสดี {firstName}
              {!isSupervisor && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (แสดงเฉพาะงานของคุณ)
                </span>
              )}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 pl-7">
            {now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <DashboardYearFilter currentYear={selectedYear} yearOptions={yearOptions} />
      </div>

      {/* Stats row — 4 cards */}
      <StatsCards stats={stats} />

      {/* Urgent tasks — full width */}
      <UrgentTaskList
        overdueTasks={overdueTasks}
        todayTasks={todayTasks}
        dueSoonTasks={dueSoonTasks}
        staffUsers={staffUsers}
        pendingCount={allTasks.filter((t) => t.status !== "SUBMITTED").length}
        isSupervisor={isSupervisor}
      />

      {/* Monthly overview chart — full width */}
      <MonthlyOverviewChart
        data={monthlyData}
        currentMonth={currentMonth}
        currentYear={currentYear}
        isSupervisor={isSupervisor}
        selectedYear={selectedYear}
      />

      {/* Bottom row: month progress + workload */}
      <div className={isSupervisor ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
        <MonthProgressCard
          submitted={monthSubmitted}
          processing={monthProcessing}
          todo={monthTodo}
          overdue={monthOverdue}
          total={monthTasks.length}
          monthLabel={monthLabel}
        />
        {isSupervisor && <WorkloadChart data={workloadData} />}
      </div>
    </div>
  );
}
