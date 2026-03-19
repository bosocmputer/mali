"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Task, TaskStatus, User } from "@/types";
import { formatThaiDate, formatDaysRemaining, isOverdue, cn } from "@/lib/utils";
import { CheckCircle2, Clock, ListTodo, Bell, Save } from "lucide-react";

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  staffUsers?: User[];
}

const STATUS_STEPS: { status: TaskStatus; label: string; icon: React.ElementType }[] =
  [
    { status: "TODO", label: "รอดำเนินการ", icon: ListTodo },
    { status: "PROCESSING", label: "กำลังดำเนินการ", icon: Clock },
    { status: "SUBMITTED", label: "ยื่นแล้ว", icon: CheckCircle2 },
  ];

const STATUS_ORDER: TaskStatus[] = ["TODO", "PROCESSING", "SUBMITTED"];

export function TaskDetailModal({
  open,
  onClose,
  task,
  staffUsers = [],
}: TaskDetailModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isSupervisor = session?.user?.role === "SUPERVISOR";

  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setNote(task.note ?? "");
      setEvidenceUrl(task.evidenceUrl ?? "");
      setAssignedUserId(task.assignedUserId);
    }
  }, [task, open]);

  if (!task) return null;

  const overdue = isOverdue(task.dueDate, task.status);
  const daysRemaining = formatDaysRemaining(task.dueDate, status);
  const currentStepIndex = STATUS_ORDER.indexOf(status);

  async function handleSave() {
    if (!task) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note,
          evidenceUrl,
          ...(isSupervisor ? { assignedUserId } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success("บันทึกเรียบร้อยแล้ว");
        router.refresh();
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendReminder() {
    if (!task) return;
    setNotifying(true);

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          userId: task.assignedUserId,
          type: "MANUAL",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success(json.message ?? "ส่งการแจ้งเตือนแล้ว");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setNotifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            <span className="text-primary">{task.taxType.name}</span>
            <span className="text-muted-foreground mx-2">–</span>
            <span>{task.client.companyName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status Stepper */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              สถานะงาน
            </Label>
            <div className="flex items-center gap-0">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = step.status === status;
                const isDone = STATUS_ORDER.indexOf(step.status) < currentStepIndex;
                const isLast = idx === STATUS_STEPS.length - 1;

                return (
                  <div key={step.status} className="flex items-center flex-1">
                    <button
                      onClick={() => setStatus(step.status)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-xs font-medium flex-1",
                        isActive
                          ? "bg-primary text-white"
                          : isDone
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          : "bg-slate-50 text-muted-foreground hover:bg-slate-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{step.label}</span>
                    </button>
                    {!isLast && (
                      <div
                        className={cn(
                          "h-0.5 w-3 flex-shrink-0",
                          isDone || isActive ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Task Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">สิ้นรอบบัญชี</p>
              <p className="font-medium mt-0.5">
                {formatThaiDate(task.fiscalYearEndDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">วันครบกำหนด</p>
              <p className="font-medium mt-0.5">
                {formatThaiDate(task.dueDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">กฎที่ใช้</p>
              <p className="font-medium mt-0.5 text-xs">
                {task.ruleUsed ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">เวลาคงเหลือ</p>
              <Badge
                variant="outline"
                className={cn(
                  "mt-0.5 text-xs",
                  status === "SUBMITTED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : overdue
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                )}
              >
                {daysRemaining}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Assigned Staff (Supervisor can change) */}
          {isSupervisor && staffUsers.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-sm">ผู้รับผิดชอบ</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">
                ผู้รับผิดชอบ
              </Label>
              <p className="text-sm font-medium">{task.assignedUser.name}</p>
            </div>
          )}

          {/* Evidence URL */}
          <div className="space-y-1.5">
            <Label className="text-sm">ลิงก์หลักฐาน (URL)</Label>
            <Input
              placeholder="https://example.com/document.pdf"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              ใส่ URL ของเอกสารหลักฐาน (PDF, รูปภาพ)
            </p>
            {evidenceUrl && (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
              >
                ดูหลักฐาน →
              </a>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">บันทึก / หมายเหตุ</Label>
            <Textarea
              placeholder="เพิ่มหมายเหตุสำหรับงานนี้..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {isSupervisor && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendReminder}
                disabled={notifying}
                className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <Bell className="h-4 w-4" />
                {notifying ? "กำลังส่ง..." : "ส่งการแจ้งเตือน"}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={onClose}>
                ปิด
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
