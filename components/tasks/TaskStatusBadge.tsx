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
    className: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
  },
  PROCESSING: {
    label: "กำลังดำเนินการ",
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  SUBMITTED: {
    label: "ยื่นแล้ว",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
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
          "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
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
