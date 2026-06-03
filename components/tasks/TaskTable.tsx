"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Eye, Info, Filter, ListTodo, PlusCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskQuickStatusMenu } from "./TaskQuickStatusMenu";
import { TaskDetailModal } from "./TaskDetailModal";
import { CreateTaskModal } from "./CreateTaskModal";
import { Pagination } from "@/components/ui/pagination";
import { Task, User } from "@/types";

const PAGE_SIZE = 10;
import {
  formatThaiDate,
  formatDaysRemaining,
  isOverdue,
  MONTH_NAMES_TH,
  cn,
} from "@/lib/utils";

interface TaskTableProps {
  staffUsers: User[];
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = String(new Date().getMonth() + 1);

export function TaskTable({ staffUsers }: TaskTableProps) {
  const { data: session } = useSession();
  const isSupervisor = session?.user?.role === "SUPERVISOR";
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncing, setDebouncing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Filters — อ่านจาก URL params ก่อน แล้ว fallback เป็น smart defaults
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") ?? "all"
  );
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>(
    // STAFF เห็นเดือนปัจจุบันเป็น default, SUPERVISOR เห็นทุกเดือน
    // isSupervisor ยังไม่รู้ตอน init (session ยัง null) — ใช้ "all" เป็น safe default แล้วปรับใน useEffect
    "all"
  );
  const [yearFilter, setYearFilter] = useState<string>(
    String(CURRENT_YEAR) // default ปีปัจจุบันแทน "all"
  );
  // ป้องกัน default filters ถูกตั้งซ้ำหลัง session โหลด
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const yearOptions = Array.from({ length: 4 }, (_, i) =>
    String(CURRENT_YEAR - i)
  );

  // ตั้ง smart defaults เมื่อรู้ role แล้ว (ทำครั้งเดียว)
  useEffect(() => {
    if (defaultsApplied || session === undefined) return;
    setDefaultsApplied(true);
    // STAFF: default เดือนปัจจุบัน; SUPERVISOR: ทุกเดือน
    if (!isSupervisor && !searchParams.get("month")) {
      setMonthFilter(CURRENT_MONTH);
    }
  }, [session, isSupervisor, defaultsApplied, searchParams]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (isSupervisor && assigneeFilter !== "all")
      params.set("assignedUserId", assigneeFilter);
    if (monthFilter !== "all") params.set("month", monthFilter);
    if (yearFilter !== "all") params.set("year", yearFilter);
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setTasks(json.data ?? []);
    } catch {
      // silent — network errors don't need to surface in production
    } finally {
      setLoading(false);
    }
  }, [statusFilter, assigneeFilter, monthFilter, yearFilter, search, isSupervisor]);

  useEffect(() => {
    setDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncing(false);
      setPage(1);
      fetchTasks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Smart defaults สำหรับ "ล้างตัวกรอง" — กลับไปที่ปีปัจจุบัน/เดือนปัจจุบัน ไม่ใช่ "all"
  const defaultYear = String(CURRENT_YEAR);
  const defaultMonth = isSupervisor ? "all" : CURRENT_MONTH;

  const hasActiveFilter =
    statusFilter !== "all" ||
    monthFilter !== defaultMonth ||
    yearFilter !== defaultYear ||
    (isSupervisor && assigneeFilter !== "all") ||
    search.trim() !== "";

  // Banner แสดงเมื่อ STAFF ดู default view (ไม่มี filter active)
  const showStaffBanner = !isSupervisor && !hasActiveFilter && !loading;

  const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
  const paginated = tasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleViewTask(task: Task) {
    setSelectedTask(task);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setTimeout(() => {
      setSelectedTask(null);
      fetchTasks();
    }, 200);
  }

  return (
    <div className="space-y-4">

      {/* Info banner — how tasks are created */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-400">
        <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          งานถูกสร้างอัตโนมัติทุกคืน <span className="font-semibold">01:00 น.</span> หลังจากเพิ่มลูกค้าและกำหนดประเภทภาษีแล้ว — งานแต่ละรายการจะไม่ถูกสร้างซ้ำ
          {isSupervisor && <> · Supervisor สามารถ<button type="button" onClick={() => setCreateOpen(true)} className="underline font-medium ml-1">สร้างงานด้วยตัวเองได้ทันที</button></>}
        </span>
      </div>

      {/* Supervisor: create task button */}
      {isSupervisor && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            สร้างงาน
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">ตัวกรอง</span>
          </div>
          <div className="flex items-center gap-3">
            {debouncing && (
              <span className="text-xs text-muted-foreground animate-pulse">กำลังค้นหา...</span>
            )}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setMonthFilter(defaultMonth);
                  setYearFilter(defaultYear);
                  setAssigneeFilter("all");
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Filter className="h-3 w-3" />
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative col-span-2 sm:col-span-1 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อบริษัท..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="OVERDUE">เกินกำหนด</SelectItem>
              <SelectItem value="TODO">รอดำเนินการ</SelectItem>
              <SelectItem value="PROCESSING">กำลังดำเนินการ</SelectItem>
              <SelectItem value="SUBMITTED">ยื่นแล้ว</SelectItem>
            </SelectContent>
          </Select>

          {/* Month Filter */}
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger>
              <SelectValue placeholder="เดือน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกเดือน</SelectItem>
              {MONTH_NAMES_TH.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Filter */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="ปี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกปี</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {Number(y) + 543}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignee Filter (Supervisor only) */}
          {isSupervisor ? (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="ผู้รับผิดชอบ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกคน</SelectItem>
                {staffUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Staff default-view banner */}
      {showStaffBanner && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
          <ListTodo className="h-3.5 w-3.5 flex-shrink-0" />
          งานของคุณ — {MONTH_NAMES_TH[Number(CURRENT_MONTH) - 1]} {CURRENT_YEAR + 543}
        </div>
      )}

      {/* Year=all warning */}
      {yearFilter === "all" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          แสดงทุกปี — ผลลัพธ์อาจมีจำนวนมาก แนะนำให้เลือกปีเพื่อความแม่นยำ
        </div>
      )}

      {/* Filter summary chip */}
      {!loading && hasActiveFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-400">
          <Filter className="h-3.5 w-3.5 flex-shrink-0" />
          กรองแล้ว: <span className="font-semibold">{tasks.length} รายการ</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pl-6">บริษัท/ห้างหุ้นส่วนฯ</TableHead>
              <TableHead>ประเภทภาษี</TableHead>
              <TableHead className="hidden md:table-cell">สิ้นรอบบัญชี</TableHead>
              <TableHead className="hidden sm:table-cell">ผู้รับผิดชอบ</TableHead>
              <TableHead>ครบกำหนด</TableHead>
              <TableHead className="hidden sm:table-cell">เวลาคงเหลือ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right pr-6">รายละเอียด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right pr-6"><Skeleton className="h-8 w-12 ml-auto rounded" /></TableCell>
                </TableRow>
              ))
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  {hasActiveFilter ? (
                    <span>ไม่พบงานที่ตรงกับเงื่อนไข</span>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">ยังไม่มีงานในระบบ</p>
                      <p className="text-xs max-w-xs mx-auto">
                        งานจะถูกสร้างอัตโนมัติทุกคืน 01:00 น. หลังเพิ่มลูกค้าและกำหนดประเภทภาษีแล้ว
                      </p>
                      {isSupervisor && (
                        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-1">
                          <PlusCircle className="h-3.5 w-3.5" />
                          สร้างงานทันที
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                const isCritical = task.priority === "CRITICAL";
                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      "cursor-pointer transition-colors duration-100",
                      overdue
                        ? "bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/80 dark:hover:bg-red-950/40 border-l-2 border-l-red-400"
                        : isCritical
                        ? "hover:bg-orange-50/60 dark:hover:bg-orange-950/30 border-l-2 border-l-orange-300"
                        : "hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border-l-2 border-l-transparent"
                    )}
                    onClick={() => handleViewTask(task)}
                  >
                    <TableCell className="pl-6">
                      <p className="text-sm font-medium text-foreground">
                        {task.client.companyName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-xs">
                        {task.taxType.name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatThaiDate(task.fiscalYearEndDate)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {task.assignedUser.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatThaiDate(task.dueDate)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          overdue ? "text-red-600" : "text-muted-foreground"
                        )}
                      >
                        {formatDaysRemaining(task.dueDate, task.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TaskQuickStatusMenu
                        task={task}
                        onUpdated={fetchTasks}
                      />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTask(task);
                        }}
                        className="h-8 gap-1 text-xs text-primary hover:bg-blue-50 dark:hover:bg-blue-950/50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        ดู
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            แสดง {tasks.length} รายการ
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Detail Modal */}
      <TaskDetailModal
        open={modalOpen}
        onClose={handleModalClose}
        task={selectedTask}
        staffUsers={staffUsers}
      />

      {/* Create Task Modal (Supervisor only) */}
      {isSupervisor && (
        <CreateTaskModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            fetchTasks();
          }}
          staffUsers={staffUsers}
        />
      )}

    </div>
  );
}
