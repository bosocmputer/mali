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
  WAITING_DOCS:
    "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-950/50",
  PROCESSING:
    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50",
  FILED:
    "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50",
  AWAITING_CLIENT_PAYMENT:
    "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-950/50",
  AWAITING_OFFICE_PAYMENT:
    "bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-950/50",
  DONE:
    "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50",
  NOT_FILING:
    "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 border-dashed hover:bg-zinc-100 dark:hover:bg-zinc-800",
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
      {late && <span className="sr-only">เกินกำหนด </span>}
      {label}
    </Badge>
  );
}
