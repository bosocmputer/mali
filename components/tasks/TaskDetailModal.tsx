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
import {
  CheckCircle2,
  Clock,
  ListTodo,
  Bell,
  Save,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  staffUsers?: User[];
}

const STATUS_STEPS: { status: TaskStatus; label: string; icon: React.ElementType }[] = [
  { status: "TODO",       label: "รอดำเนินการ",    icon: ListTodo },
  { status: "PROCESSING", label: "กำลังดำเนินการ", icon: Clock },
  { status: "SUBMITTED",  label: "ยื่นแล้ว",        icon: CheckCircle2 },
];

const STATUS_ORDER: TaskStatus[] = ["TODO", "PROCESSING", "SUBMITTED"];

function isValidUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

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
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [nextCyclePreview, setNextCyclePreview] = useState<{
    nextFiscalYearEndDate: string;
    nextDueDate: string;
    alreadyExists: boolean;
  } | null>(null);
  const [loadingNextCycle, setLoadingNextCycle] = useState(false);
  const [confirmNextCycle, setConfirmNextCycle] = useState(false);
  const [creatingNextCycle, setCreatingNextCycle] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setNote(task.note ?? "");
      setEvidenceUrl(task.evidenceUrl ?? "");
      setAssignedUserId(task.assignedUserId);
      setConfirmSubmit(false);
      setConfirmReverse(false);
      setConfirmClose(false);
      setNextCyclePreview(null);
      setConfirmNextCycle(false);
    }
  }, [task, open]);

  if (!task) return null;

  const overdue = isOverdue(task.dueDate, task.status);
  const daysRemaining = formatDaysRemaining(task.dueDate, status);
  const currentStepIndex = STATUS_ORDER.indexOf(status);
  const urlInvalid = evidenceUrl.trim() !== "" && !isValidUrl(evidenceUrl);

  const isDirty =
    note !== (task.note ?? "") ||
    evidenceUrl !== (task.evidenceUrl ?? "") ||
    (isSupervisor && assignedUserId !== task.assignedUserId);

  const isSubmitted = (status as string) === "SUBMITTED";
  const canAdvance = status !== "SUBMITTED";
  const nextStatus: TaskStatus | null =
    status === "TODO" ? "PROCESSING" : status === "PROCESSING" ? "SUBMITTED" : null;
  const nextLabel =
    status === "TODO" ? "เริ่มดำเนินการ" : status === "PROCESSING" ? "ยืนยันยื่นแล้ว" : null;

  function handleAdvance() {
    if (!nextStatus) return;
    if (nextStatus === "SUBMITTED") {
      setConfirmSubmit(true);
    } else {
      // เปลี่ยนสถานะ → save ทันที ไม่ต้องกดบันทึกซ้ำ
      saveToServer(nextStatus);
    }
  }

  function handleRequestClose() {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  }

  async function saveToServer(newStatus?: TaskStatus) {
    if (!task) return;
    if (urlInvalid) {
      toast.error("URL หลักฐานไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
      return;
    }
    const targetStatus = newStatus ?? status;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          note,
          evidenceUrl,
          ...(isSupervisor ? { assignedUserId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        if (newStatus) {
          // status change — update local state and stay open
          setStatus(newStatus);
          toast.success(
            newStatus === "PROCESSING" ? "เริ่มดำเนินการแล้ว" :
            newStatus === "SUBMITTED"  ? "บันทึกการยื่นเรียบร้อย" :
            "บันทึกเรียบร้อยแล้ว"
          );
          router.refresh();
        } else {
          toast.success("บันทึกเรียบร้อยแล้ว");
          router.refresh();
          onClose();
        }
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
        body: JSON.stringify({ taskId: task.id, userId: task.assignedUserId, type: "MANUAL" }),
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

  async function handlePreviewNextCycle() {
    if (!task) return;
    setLoadingNextCycle(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/next-cycle`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        setNextCyclePreview(json.data);
        setConfirmNextCycle(true);
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoadingNextCycle(false);
    }
  }

  async function handleCreateNextCycle() {
    if (!task) return;
    setCreatingNextCycle(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/next-cycle`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        setConfirmNextCycle(false);
        setNextCyclePreview(null);
        toast.success("สร้างงานรอบถัดไปเรียบร้อยแล้ว");
        router.refresh();
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setCreatingNextCycle(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleRequestClose()}>
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
              <Label className="text-xs text-muted-foreground mb-2 block">สถานะปัจจุบัน</Label>
              <div className="flex items-center gap-0">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = step.status === status;
                  const isDone = STATUS_ORDER.indexOf(step.status) < currentStepIndex;
                  const isLast = idx === STATUS_STEPS.length - 1;

                  return (
                    <div key={step.status} className="flex items-center flex-1">
                      <div
                        className={cn(
                          "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium flex-1 select-none",
                          isActive
                            ? "bg-primary text-white"
                            : isDone
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-50 text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{step.label}</span>
                      </div>
                      {!isLast && (
                        <div className={cn("h-0.5 w-3 flex-shrink-0", isDone || isActive ? "bg-primary" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* เปลี่ยนสถานะงาน — อยู่ใต้ stepper */}
            {(canAdvance || (isSupervisor && (status as string) !== "TODO")) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  เปลี่ยนสถานะงาน
                </p>
                <div className="flex gap-2 flex-wrap">
                  {canAdvance && (
                    <Button
                      onClick={handleAdvance}
                      disabled={saving}
                      className="gap-2 flex-1"
                    >
                      <ChevronRight className="h-4 w-4" />
                      {nextLabel}
                    </Button>
                  )}
                  {isSupervisor && (status as string) !== "TODO" && (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmReverse(true)}
                      disabled={saving}
                      className="gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      ย้อนสถานะ
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  การเปลี่ยนสถานะจะบันทึกทันที
                </p>
              </div>
            )}

            <Separator />

            {/* Task Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">วันสิ้นรอบบัญชี</p>
                <p className="font-medium mt-0.5">
                  {(() => {
                    const d = new Date(task.fiscalYearEndDate);
                    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">วันครบกำหนด</p>
                <p className="font-medium mt-0.5">{formatThaiDate(task.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">เงื่อนไขการยื่นแบบ</p>
                <p className="font-medium mt-0.5 text-xs">{task.ruleUsed ?? "-"}</p>
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
              <div>
                <p className="text-xs text-muted-foreground">ระดับความเร่งด่วน</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      task.priority === "CRITICAL" ? "bg-red-50 text-red-700 border-red-200" :
                      task.priority === "HIGH"     ? "bg-orange-50 text-orange-700 border-orange-200" :
                      task.priority === "MEDIUM"   ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                     "bg-slate-50 text-slate-600 border-slate-200"
                    )}
                  >
                    {task.priority === "CRITICAL" ? "วิกฤต" :
                     task.priority === "HIGH"     ? "สูง" :
                     task.priority === "MEDIUM"   ? "กลาง" : "ต่ำ"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">วิธียื่นแบบ</p>
                <p className="font-medium mt-0.5 text-xs">
                  {task.client.filingMethod === "E_FILING" ? "ยื่นออนไลน์" :
                   task.client.filingMethod === "PAPER"    ? "ยื่นกระดาษ" :
                   "-"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Assigned Staff */}
            {isSupervisor && staffUsers.length > 0 ? (
              <div className="space-y-1.5">
                <Label className="text-sm">ผู้รับผิดชอบ</Label>
                <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">ผู้รับผิดชอบ</Label>
                <p className="text-sm font-medium">{task.assignedUser.name}</p>
              </div>
            )}

            {/* Evidence URL */}
            <div className="space-y-1.5">
              <Label className="text-sm">แนบไฟล์เอกสาร</Label>
              <Input
                placeholder="https://example.com/document.pdf"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className={cn("text-sm", urlInvalid && "border-red-400 focus-visible:ring-red-300")}
              />
              {urlInvalid ? (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  URL ไม่ถูกต้อง — ต้องขึ้นต้นด้วย https:// หรือ http://
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">ใส่ URL ของเอกสารหลักฐาน (PDF, รูปภาพ)</p>
              )}
              {evidenceUrl && !urlInvalid && (
                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary underline"
                >
                  ดูหลักฐาน <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm">หมายเหตุ</Label>
              <Textarea
                placeholder="เพิ่มหมายเหตุสำหรับงานนี้..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <Separator />

            {/* ── Bottom Action Zone ── */}

            {/* บันทึก note/evidence/assignee */}
            <div className="flex items-center justify-between">
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
                <Button variant="outline" size="sm" onClick={handleRequestClose}>ปิด</Button>
                <Button
                  size="sm"
                  onClick={() => saveToServer()}
                  disabled={saving || urlInvalid || !isDirty}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </div>


            {/* สร้างรอบถัดไป — เฉพาะ Supervisor + งานยื่นแล้ว */}
            {(isSupervisor && isSubmitted) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    รอบถัดไป
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewNextCycle}
                    disabled={loadingNextCycle}
                    className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <RefreshCw className={cn("h-4 w-4", loadingNextCycle && "animate-spin")} />
                    {loadingNextCycle ? "กำลังคำนวณ..." : "สร้างรอบถัดไป"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    สร้างงานใหม่สำหรับรอบบัญชีถัดไป (คำนวณวันครบกำหนดอัตโนมัติ)
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Reverse dialog */}
      <Dialog open={confirmReverse} onOpenChange={(v) => !v && setConfirmReverse(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              ยืนยันย้อนสถานะ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ย้อนสถานะจาก{" "}
            <span className="font-semibold text-foreground">
              {STATUS_STEPS[currentStepIndex]?.label}
            </span>{" "}
            กลับไปเป็น{" "}
            <span className="font-semibold text-foreground">
              {STATUS_STEPS[currentStepIndex - 1]?.label}
            </span>
            ?
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setConfirmReverse(false)}>ยกเลิก</Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => {
                const prevStatus = STATUS_ORDER[currentStepIndex - 1];
                setConfirmReverse(false);
                saveToServer(prevStatus);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              ย้อนสถานะ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm SUBMITTED dialog */}
      <Dialog open={confirmSubmit} onOpenChange={(v) => !v && setConfirmSubmit(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ยืนยันการยื่น
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ยืนยันว่า{" "}
            <span className="font-semibold text-foreground">{task.taxType.name}</span>{" "}
            ของ{" "}
            <span className="font-semibold text-foreground">{task.client.companyName}</span>{" "}
            ยื่นเรียบร้อยแล้ว?
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Staff จะไม่สามารถย้อนสถานะได้ — Supervisor เปลี่ยนได้
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setConfirmSubmit(false)}>ยกเลิก</Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => {
                setConfirmSubmit(false);
                saveToServer("SUBMITTED");
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              ยืนยัน ยื่นแล้ว
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm next cycle creation */}
      <Dialog open={confirmNextCycle} onOpenChange={(v) => !v && setConfirmNextCycle(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-600" />
              ยืนยันสร้างรอบถัดไป
            </DialogTitle>
          </DialogHeader>
          {nextCyclePreview?.alreadyExists ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              งานรอบนี้มีอยู่แล้วในระบบ ไม่สามารถสร้างซ้ำได้
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                สร้างงาน{" "}
                <span className="font-semibold text-foreground">{task?.taxType.name}</span>{" "}
                รอบบัญชีถัดไปสำหรับ{" "}
                <span className="font-semibold text-foreground">{task?.client.companyName}</span>
              </p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">สิ้นรอบบัญชีถัดไป</span>
                  <span className="font-medium">
                    {nextCyclePreview ? formatThaiDate(nextCyclePreview.nextFiscalYearEndDate) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">วันครบกำหนด</span>
                  <span className="font-semibold text-primary">
                    {nextCyclePreview ? formatThaiDate(nextCyclePreview.nextDueDate) : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setConfirmNextCycle(false)}>
              ยกเลิก
            </Button>
            {!nextCyclePreview?.alreadyExists && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={handleCreateNextCycle}
                disabled={creatingNextCycle}
              >
                <RefreshCw className={cn("h-4 w-4", creatingNextCycle && "animate-spin")} />
                {creatingNextCycle ? "กำลังสร้าง..." : "สร้างงาน"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm close with unsaved changes */}
      <Dialog open={confirmClose} onOpenChange={(v) => !v && setConfirmClose(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              มีข้อมูลที่ยังไม่ได้บันทึก
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            คุณมีการเปลี่ยนแปลง (note / หลักฐาน / ผู้รับผิดชอบ) ที่ยังไม่ได้บันทึก ต้องการออกโดยไม่บันทึกไหม?
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setConfirmClose(false)}>
              กลับไปแก้ไข
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { setConfirmClose(false); onClose(); }}
            >
              ออกโดยไม่บันทึก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
