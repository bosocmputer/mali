import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { taskStatusDisplay } from "@/lib/taskStatusDisplay";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  isOverdue?: boolean;
  className?: string;
}

const statusClass: Record<TaskStatus, string> = {
  TODO: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700",
  PROCESSING:
    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50",
  SUBMITTED:
    "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50",
};

export function TaskStatusBadge({
  status,
  isOverdue,
  className,
}: TaskStatusBadgeProps) {
  const { label, late } = taskStatusDisplay(status, !!isOverdue);

  return (
    <Badge
      variant="outline"
      title={late ? "เกินกำหนดแล้ว" : undefined}
      className={cn(
        statusClass[status],
        late && "border-red-400 dark:border-red-700",
        className
      )}
    >
      {late && (
        <>
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
          <span className="sr-only">เกินกำหนด </span>
        </>
      )}
      {label}
    </Badge>
  );
}
