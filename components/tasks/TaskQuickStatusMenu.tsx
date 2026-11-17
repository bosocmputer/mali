"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { Task } from "@/types";
import { bangkokDateString, isOverdue, notifyTasksChanged } from "@/lib/utils";
import { PAYMENT_TYPE_LABEL, type WorkflowAction } from "@/lib/taskWorkflow";

interface TaskQuickStatusMenuProps {
  task: Task;
  onUpdated: (task: Task) => void;
}

/**
 * Fast path from the task table: start work, or file today when nothing else needs typing
 * (no amount — i.e. not "office pays"). Everything else is done in the task detail window.
 */
export function TaskQuickStatusMenu({ task, onUpdated }: TaskQuickStatusMenuProps) {
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const overdue = isOverdue(task.dueDate, task.status);

  const canStart = task.status === "TODO";
  const canQuickFile =
    (task.status === "TODO" || task.status === "PROCESSING") &&
    !(task.hasPayment && task.paymentType === "OFFICE_PAYS");

  if (!canStart && !canQuickFile) {
    return <TaskStatusBadge status={task.status} isOverdue={overdue} />;
  }

  async function apply(action: WorkflowAction, successText: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(successText);
        onUpdated(json.data as Task);
        notifyTasksChanged();
      } else {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="flex items-center gap-1 group cursor-pointer"
            disabled={loading}
          >
            <TaskStatusBadge status={task.status} isOverdue={overdue} />
            {loading
              ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            }
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          {canStart && (
            <DropdownMenuItem
              onSelect={() => apply({ type: "START" }, "เริ่มจัดทำแล้ว")}
              className="cursor-pointer"
            >
              เริ่มจัดทำ
            </DropdownMenuItem>
          )}
          {canQuickFile && (
            <DropdownMenuItem
              onSelect={() => {
                // ปิด dropdown ก่อน แล้วค่อยเปิด dialog — ป้องกัน Radix focus trap ติดค้าง
                setDropdownOpen(false);
                setTimeout(() => setConfirmOpen(true), 50);
              }}
              className="cursor-pointer"
            >
              ยื่นแบบแล้ว (วันนี้)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirm before filing — prevents a mis-click */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>ยืนยันยื่นแบบแล้ว</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ยืนยันว่าได้ยื่น <span className="font-medium text-foreground">{task.taxType.name}</span>{" "}
            ของ <span className="font-medium text-foreground">{task.client.companyName}</span> วันนี้?
          </p>
          <p className="text-xs text-muted-foreground">
            {task.hasPayment ? `ประเภทการชำระ: ${PAYMENT_TYPE_LABEL[task.paymentType]} · ` : ""}งานจะเป็น “เสร็จสิ้น”
            — ถ้าต้องใส่ยอดภาษีหรือวันที่อื่น ให้เปิดรายละเอียดงาน
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>ยกเลิก</Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                apply({ type: "FILE", filedAt: bangkokDateString() }, "บันทึกการยื่นแบบแล้ว");
              }}
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
