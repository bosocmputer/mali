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
import { isOverdue } from "@/lib/utils";

interface TaskQuickStatusMenuProps {
  task: Task;
  onUpdated: (taskId: string, newStatus: "PROCESSING" | "SUBMITTED") => void;
}

export function TaskQuickStatusMenu({ task, onUpdated }: TaskQuickStatusMenuProps) {
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const overdue = isOverdue(task.dueDate, task.status);

  // SUBMITTED — static badge, no dropdown
  if (task.status === "SUBMITTED") {
    return <TaskStatusBadge status={task.status} isOverdue={false} />;
  }

  async function applyStatus(nextStatus: "PROCESSING" | "SUBMITTED") {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        toast.success(
          nextStatus === "PROCESSING" ? "เริ่มดำเนินการแล้ว" : "บันทึกการยื่นเรียบร้อย"
        );
        onUpdated(task.id, nextStatus);
      } else {
        const json = await res.json().catch(() => ({}));
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
          {task.status === "TODO" && (
            <DropdownMenuItem
              onSelect={() => applyStatus("PROCESSING")}
              className="cursor-pointer"
            >
              เริ่มดำเนินการ
            </DropdownMenuItem>
          )}
          {task.status === "PROCESSING" && (
            <DropdownMenuItem
              onSelect={() => {
                // ปิด dropdown ก่อน แล้วค่อยเปิด dialog — ป้องกัน Radix focus trap ติดค้าง
                setDropdownOpen(false);
                setTimeout(() => setConfirmOpen(true), 50);
              }}
              className="cursor-pointer"
            >
              ยืนยันยื่นแล้ว
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirm dialog ก่อน SUBMITTED — เพื่อป้องกันกดพลาด */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>ยืนยันการยื่นงาน</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ยืนยันว่าได้ยื่น <span className="font-medium text-foreground">{task.taxType.name}</span>{" "}
            ของ <span className="font-medium text-foreground">{task.client.companyName}</span> เรียบร้อยแล้ว?
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Staff จะไม่สามารถย้อนสถานะได้ — Supervisor เปลี่ยนได้
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>ยกเลิก</Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                applyStatus("SUBMITTED");
              }}
            >
              ยืนยันยื่นแล้ว
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
