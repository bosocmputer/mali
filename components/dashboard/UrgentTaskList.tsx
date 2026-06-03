"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { Task, User } from "@/types";
import { formatThaiDate, daysUntil, cn } from "@/lib/utils";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import Link from "next/link";
// Button intentionally removed — not used in this component

interface UrgentTaskListProps {
  overdueTasks: Task[];
  dueSoonTasks: Task[];
  todayTasks: Task[];
  staffUsers?: User[];
}

export function UrgentTaskList({
  overdueTasks,
  dueSoonTasks,
  todayTasks,
  staffUsers = [],
}: UrgentTaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sections: { label: string; tasks: Task[]; variant: "overdue" | "today" | "soon" }[] = (
    [
      { label: "เกินกำหนด", tasks: overdueTasks, variant: "overdue" as const },
      { label: "ครบกำหนดวันนี้", tasks: todayTasks, variant: "today" as const },
      { label: "ใกล้ครบกำหนด", tasks: dueSoonTasks, variant: "soon" as const },
    ] as const
  ).filter((s) => s.tasks.length > 0) as { label: string; tasks: Task[]; variant: "overdue" | "today" | "soon" }[];

  const totalCount = overdueTasks.length + todayTasks.length + dueSoonTasks.length;

  if (totalCount === 0) {
    return (
      <Card className="shadow-sm border-emerald-100 dark:border-emerald-900">
        <CardContent className="py-10 text-center">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-emerald-700 dark:text-emerald-400 font-medium">ไม่มีงานเร่งด่วนในขณะนี้</p>
          <p className="text-xs text-muted-foreground mt-1">ทุกงานอยู่ในเกณฑ์ปกติ</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              งานที่ต้องดำเนินการ
              <Badge variant="outline" className="text-xs bg-muted">{totalCount} รายการ</Badge>
            </span>
            <Link href="/tasks" className="text-xs font-normal text-primary hover:underline">
              ดูทั้งหมด →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {sections.map(({ label, tasks, variant }) => (
              <div key={label}>
                {/* Section header */}
                <div className={cn(
                  "px-5 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  variant === "overdue" ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400" :
                  variant === "today"   ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400" :
                                          "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                )}>
                  {label} ({tasks.length})
                </div>

                {tasks.map((task) => {
                  const days = daysUntil(task.dueDate);
                  const isOverdue = days < 0;
                  const isToday = days === 0;

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/50 text-left transition-colors group"
                    >
                      {/* Left accent */}
                      <div className={cn(
                        "w-1 self-stretch rounded-full flex-shrink-0",
                        isOverdue ? "bg-red-400" :
                        isToday   ? "bg-amber-400" :
                                    "bg-blue-300"
                      )} />

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">
                            {task.client.companyName}
                          </span>
                          <Badge variant="outline" className="text-xs font-mono flex-shrink-0">
                            {task.taxType.name}
                          </Badge>
                          {task.priority === "CRITICAL" && (
                            <Badge className="text-xs bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 flex-shrink-0">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            ครบ {formatThaiDate(task.dueDate)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {task.assignedUser.name}
                          </span>
                        </div>
                      </div>

                      {/* Days badge */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isOverdue ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" :
                            isToday   ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" :
                                        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          )}
                        >
                          {isOverdue ? `เกิน ${Math.abs(days)} วัน` :
                           isToday   ? "วันนี้" :
                                       `อีก ${days} วัน`}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        staffUsers={staffUsers}
      />
    </>
  );
}
