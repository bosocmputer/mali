"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarX, CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/types";
import {
  formatThaiDate,
  isOverdue,
  MONTH_NAMES_TH,
  DAY_NAMES_SHORT_TH,
  cn,
} from "@/lib/utils";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";

interface TaxCalendarProps {
  tasks: Task[];
}

type FilterType = "all" | "pending" | "overdue";

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// dot บน mini calendar: แดง = มีงานค้าง/เกินกำหนด, เขียว = ทุกงานเสร็จแล้ว
function getDayDotColor(dayTasks: Task[]): "red" | "green" | "amber" | null {
  if (dayTasks.length === 0) return null;
  const hasOverdue = dayTasks.some((t) => isOverdue(t.dueDate, t.status));
  if (hasOverdue) return "red";
  const allDone = dayTasks.every((t) => t.status === "SUBMITTED");
  if (allDone) return "green";
  const hasProcessing = dayTasks.some((t) => t.status === "PROCESSING");
  if (hasProcessing) return "amber";
  return "red"; // has TODO
}

function StatusIcon({ task }: { task: Task }) {
  const overdue = isOverdue(task.dueDate, task.status);
  if (overdue) return <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
  if (task.status === "SUBMITTED") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />;
  if (task.status === "PROCESSING") return <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />;
  return <ListTodo className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />;
}

function StatusBadge({ task }: { task: Task }) {
  const overdue = isOverdue(task.dueDate, task.status);
  if (overdue) return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">เกินกำหนด</Badge>;
  if (task.status === "SUBMITTED") return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">ยื่นแล้ว</Badge>;
  if (task.status === "PROCESSING") return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">กำลังดำเนินการ</Badge>;
  return <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">รอดำเนินการ</Badge>;
}

export function TaxCalendar({ tasks }: TaxCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  }
  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedDate(null);
  }

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Map: "YYYY-M-D" → Task[]
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

  // งานของเดือนที่กำลังดู เรียงตามวัน
  const monthTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const d = new Date(t.dueDate);
        return d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, viewYear, viewMonth]);

  // apply filter
  const filteredTasks = useMemo(() => {
    if (filter === "pending") return monthTasks.filter((t) => t.status !== "SUBMITTED");
    if (filter === "overdue") return monthTasks.filter((t) => isOverdue(t.dueDate, t.status));
    return monthTasks;
  }, [monthTasks, filter]);

  // Group by date string "YYYY-MM-DD"
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Task[]>();
    filteredTasks.forEach((t) => {
      const key = t.dueDate.slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });
    return groups;
  }, [filteredTasks]);

  const sortedDateKeys = useMemo(() => Array.from(groupedByDate.keys()).sort(), [groupedByDate]);

  // scroll list ไปวันที่กดบน mini calendar
  useEffect(() => {
    if (!selectedDate || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-date="${selectedDate}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedDate]);

  const thaiYear = viewYear + 543;

  // stats ของเดือน
  const stats = useMemo(() => ({
    total: monthTasks.length,
    submitted: monthTasks.filter((t) => t.status === "SUBMITTED").length,
    pending: monthTasks.filter((t) => t.status !== "SUBMITTED").length,
    overdue: monthTasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
  }), [monthTasks]);

  return (
    <>
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base font-semibold text-foreground min-w-[140px] text-center">
              {MONTH_NAMES_TH[viewMonth - 1]} {thaiYear}
            </h3>
            <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-7 ml-1">
              วันนี้
            </Button>
          </div>
          {/* Stats summary */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              เกินกำหนด {stats.overdue}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              ค้างอยู่ {stats.pending}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              เสร็จแล้ว {stats.submitted}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* ── ซ้าย: Mini Calendar ── */}
          <div className="lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES_SHORT_TH.map((d, i) => (
                <div key={d} className={cn(
                  "text-center text-xs font-medium py-1",
                  i === 0 ? "text-red-400" : "text-muted-foreground"
                )}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="h-9" />;

                const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
                const dayTasks = tasksByDay.get(key) ?? [];
                const dotColor = getDayDotColor(dayTasks);
                const isToday = isSameDay(day, today);
                const isSunday = day.getDay() === 0;
                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => dayTasks.length > 0 ? setSelectedDate(isSelected ? null : dateStr) : undefined}
                    className={cn(
                      "h-9 w-full flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors relative",
                      isToday && !isSelected && "bg-primary text-white",
                      isSelected && "bg-primary/10 ring-1 ring-primary text-primary",
                      !isToday && !isSelected && isSunday && "text-red-400",
                      !isToday && !isSelected && !isSunday && "text-foreground",
                      dayTasks.length > 0 && !isSelected && "hover:bg-slate-100 cursor-pointer",
                      dayTasks.length === 0 && "cursor-default opacity-50"
                    )}
                  >
                    <span>{day.getDate()}</span>
                    {dotColor && (
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full absolute bottom-0.5",
                        dotColor === "red"   ? "bg-red-500" :
                        dotColor === "green" ? "bg-emerald-500" :
                                              "bg-amber-500"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend — mini */}
            <div className="mt-4 space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">คำอธิบายสี dot</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                มีงานค้าง / เกินกำหนด
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                กำลังดำเนินการ
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                ทุกงานเสร็จแล้ว
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1">กดวันที่บนปฏิทินเพื่อ scroll ไปงานนั้น</p>
            </div>
          </div>

          {/* ── ขวา: Timeline List ── */}
          <div className="flex-1 flex flex-col min-h-[480px]">
            {/* Filter bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-slate-50/50">
              <span className="text-xs text-muted-foreground mr-1">แสดง:</span>
              {(["all", "pending", "overdue"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors",
                    filter === f
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {f === "all" ? `ทั้งหมด (${stats.total})` :
                   f === "pending" ? `ยังไม่เสร็จ (${stats.pending})` :
                   `เกินกำหนด (${stats.overdue})`}
                </button>
              ))}
            </div>

            {/* Task list */}
            <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-border">
              {sortedDateKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground gap-3">
                  <CalendarX className="h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium">
                    {filter === "overdue" ? "ไม่มีงานเกินกำหนดในเดือนนี้" :
                     filter === "pending" ? "ไม่มีงานค้างในเดือนนี้" :
                     "ไม่มีงานในเดือนนี้"}
                  </p>
                </div>
              ) : (
                sortedDateKeys.map((dateKey) => {
                  const dayTasks = groupedByDate.get(dateKey)!;
                  const dateObj = new Date(dateKey + "T00:00:00");
                  const isToday = isSameDay(dateObj, today);
                  const isPast = dateObj < today && !isToday;

                  return (
                    <div key={dateKey} data-date={dateKey}>
                      {/* Date header */}
                      <div className={cn(
                        "sticky top-0 z-10 flex items-center gap-3 px-5 py-2 border-b border-border",
                        isToday ? "bg-primary/5 border-primary/20" :
                        isPast  ? "bg-red-50/60" :
                                  "bg-slate-50/80"
                      )}>
                        <div className={cn(
                          "text-sm font-semibold",
                          isToday ? "text-primary" :
                          isPast  ? "text-red-600" :
                                    "text-foreground"
                        )}>
                          {formatThaiDate(dateObj)}
                        </div>
                        {isToday && (
                          <Badge className="text-xs bg-primary text-white h-5">วันนี้</Badge>
                        )}
                        {isPast && !isToday && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 h-5">เลยกำหนด</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{dayTasks.length} งาน</span>
                      </div>

                      {/* Tasks for this date */}
                      {dayTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 text-left transition-colors group"
                        >
                          <StatusIcon task={task} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">
                                {task.client.companyName}
                              </span>
                              <Badge variant="outline" className="text-xs font-mono flex-shrink-0">
                                {task.taxType.name}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {task.assignedUser.name}
                              {task.note && (
                                <span className="ml-2 italic opacity-70">· {task.note.slice(0, 40)}{task.note.length > 40 ? "…" : ""}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge task={task} />
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
    </>
  );
}
