"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { Task } from "@/types";
import {
  formatThaiDate,
  isOverdue,
  MONTH_NAMES_TH,
  DAY_NAMES_SHORT_TH,
  cn,
} from "@/lib/utils";

interface TaxCalendarProps {
  tasks: Task[];
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month - 1, d));
  // Pad to multiple of 7
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

function getStatusDot(task: Task): string {
  if (task.status === "SUBMITTED") return "bg-emerald-500";
  if (isOverdue(task.dueDate, task.status)) return "bg-red-500";
  if (task.status === "PROCESSING") return "bg-amber-500";
  return "bg-slate-400";
}

export function TaxCalendar({ tasks }: TaxCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1–12

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  }

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Build a map: "YYYY-MM-DD" -> Task[]
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

  const thaiYear = viewYear + 543;

  const monthHasTasks = useMemo(() => {
    return tasks.some((t) => {
      const d = new Date(t.dueDate);
      return d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth;
    });
  }, [tasks, viewYear, viewMonth]);

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">
            {MONTH_NAMES_TH[viewMonth - 1]} {thaiYear}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs h-7"
          >
            วันนี้
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 bg-slate-50/50 border-b border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          ยื่นแล้ว
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          กำลังดำเนินการ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
          รอดำเนินการ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          เกินกำหนด
        </span>
      </div>

      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES_SHORT_TH.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-medium py-2.5",
              i === 0 ? "text-red-400" : "text-muted-foreground"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!monthHasTasks && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border-b border-border">
          <CalendarX className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">ไม่มีงานในเดือนนี้</p>
          <p className="text-xs opacity-70">{MONTH_NAMES_TH[viewMonth - 1]} {thaiYear} ยังไม่มีงานที่ครบกำหนด</p>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[80px] border-b border-r border-border bg-slate-50/30"
              />
            );
          }

          const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
          const dayTasks = tasksByDay.get(key) ?? [];
          const isToday = isSameDay(day, today);
          const isSunday = day.getDay() === 0;
          const isSaturday = day.getDay() === 6;
          const isLastInRow = (idx + 1) % 7 === 0;
          const isLastRow = idx >= calendarDays.length - 7;

          return (
            <div
              key={key}
              className={cn(
                "min-h-[80px] p-1.5 border-b border-r border-border relative transition-colors",
                isLastInRow && "border-r-0",
                isLastRow && "border-b-0",
                isSunday && "bg-red-50/20",
                isSaturday && "bg-slate-50/30",
                dayTasks.length > 0 && "hover:bg-blue-50/30"
              )}
            >
              {/* Day Number */}
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday
                      ? "bg-primary text-white"
                      : isSunday
                      ? "text-red-400"
                      : "text-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Task Dots */}
              {dayTasks.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full text-left">
                      <div className="flex flex-wrap gap-0.5">
                        {dayTasks.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className={cn(
                              "w-2 h-2 rounded-full flex-shrink-0",
                              getStatusDot(t)
                            )}
                          />
                        ))}
                        {dayTasks.length > 3 && (
                          <span className="text-xs text-muted-foreground leading-none mt-0.5">
                            +{dayTasks.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="center"
                    className="w-72 p-0 shadow-lg"
                  >
                    <div className="p-3 border-b border-border bg-slate-50">
                      <p className="text-xs font-semibold text-foreground">
                        {formatThaiDate(day)} — {dayTasks.length} งาน
                      </p>
                    </div>
                    <div className="divide-y divide-border max-h-64 overflow-y-auto">
                      {dayTasks.map((t) => {
                        const overdue = isOverdue(t.dueDate, t.status);
                        return (
                          <div key={t.id} className="p-3 hover:bg-slate-50/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {t.client.companyName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {t.taxType.name}
                                  {" · "}
                                  {t.assignedUser.name}
                                </p>
                              </div>
                              <TaskStatusBadge
                                status={t.status}
                                isOverdue={overdue}
                                className="flex-shrink-0 text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
