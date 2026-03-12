"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Search, SlidersHorizontal, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskDetailModal } from "./TaskDetailModal";
import { Task, User } from "@/types";
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

export function TaskTable({ staffUsers }: TaskTableProps) {
  const { data: session } = useSession();
  const isSupervisor = session?.user?.role === "SUPERVISOR";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter] = useState<string>(String(CURRENT_YEAR));

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (isSupervisor && assigneeFilter !== "all")
      params.set("assignedUserId", assigneeFilter);
    if (monthFilter !== "all") {
      params.set("month", monthFilter);
      params.set("year", yearFilter);
    }
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setTasks(json.data ?? []);
    } catch {
      console.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, assigneeFilter, monthFilter, yearFilter, search, isSupervisor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

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
      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">ตัวกรอง</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

      {/* Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="pl-6">ผู้ประกอบการ</TableHead>
              <TableHead>ประเภทภาษี</TableHead>
              <TableHead>สิ้นรอบบัญชี</TableHead>
              <TableHead>ผู้รับผิดชอบ</TableHead>
              <TableHead>ครบกำหนด</TableHead>
              <TableHead>เวลาคงเหลือ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right pr-6">รายละเอียด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">
                    กำลังโหลด...
                  </p>
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
                  ไม่พบงานที่ตรงกับเงื่อนไข
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      "hover:bg-slate-50/50 cursor-pointer",
                      overdue && "bg-red-50/30 hover:bg-red-50/50"
                    )}
                    onClick={() => handleViewTask(task)}
                  >
                    <TableCell className="pl-6">
                      <p className="text-sm font-medium text-foreground">
                        {task.client.companyName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs">
                        {task.taxType.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatThaiDate(task.fiscalYearEndDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.assignedUser.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatThaiDate(task.dueDate)}
                    </TableCell>
                    <TableCell>
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
                      <TaskStatusBadge
                        status={task.status}
                        isOverdue={overdue}
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
                        className="h-8 gap-1 text-xs text-primary hover:bg-blue-50"
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
        <p className="text-xs text-muted-foreground">
          แสดง {tasks.length} รายการ
        </p>
      )}

      {/* Detail Modal */}
      <TaskDetailModal
        open={modalOpen}
        onClose={handleModalClose}
        task={selectedTask}
        staffUsers={staffUsers}
      />
    </div>
  );
}
