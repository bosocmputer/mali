import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  isOverdue?: boolean;
  className?: string;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  TODO: {
    label: "รอดำเนินการ",
    className: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700",
  },
  PROCESSING: {
    label: "กำลังดำเนินการ",
    className: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50",
  },
  SUBMITTED: {
    label: "ยื่นแล้ว",
    className:
      "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50",
  },
};

export function TaskStatusBadge({
  status,
  isOverdue,
  className,
}: TaskStatusBadgeProps) {
  if (isOverdue && status !== "SUBMITTED") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50",
          className
        )}
      >
        เกินกำหนด
      </Badge>
    );
  }

  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
