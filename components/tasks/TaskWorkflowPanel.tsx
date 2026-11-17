"use client";

import { clientLabel } from "@/lib/clientLabel";
import { useEffect, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileClock,
  History,
  Landmark,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileLinks, PaymentFilesInput } from "./PaymentFilesInput";
import {
  ALL_PAYMENT_TYPES,
  availableActions,
  PAYMENT_TYPE_LABEL,
  STATUS_LABEL,
  type WorkflowAction,
  type WorkflowActionType,
} from "@/lib/taskWorkflow";
import { bangkokDateString, cn, daysUntil, formatThaiDate } from "@/lib/utils";
import type { PaymentType, Task, TaskStatus, TaskStatusHistoryEntry } from "@/types";

type DialogKind = Exclude<WorkflowActionType, "SET_PAYMENT_TYPE"> | null;

const baht = (n?: number) =>
  n === undefined ? "—" : `${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

/** The main path for this task, used for the step indicator. */
function stepsFor(task: Task): TaskStatus[] {
  if (task.status === "NOT_FILING") return ["NOT_FILING"];
  const steps: TaskStatus[] = ["TODO"];
  if (task.status === "WAITING_DOCS" || task.docsRequestedAt) steps.push("WAITING_DOCS");
  steps.push("PROCESSING");
  if (task.hasPayment && task.paymentType === "OFFICE_PAYS") {
    steps.push("AWAITING_CLIENT_PAYMENT", "AWAITING_OFFICE_PAYMENT");
  }
  steps.push("DONE");
  return steps;
}

export function TaskWorkflowPanel({
  task,
  isSupervisor,
  onChanged,
}: {
  task: Task;
  isSupervisor: boolean;
  onChanged: (task: Task) => void;
}) {
  const actor = { role: isSupervisor ? ("SUPERVISOR" as const) : ("STAFF" as const) };
  const actions = availableActions(
    {
      status: task.status,
      paymentType: task.paymentType,
      hasPayment: task.hasPayment,
      frequency: task.taxType.frequency,
      docsRequestedAt: task.docsRequestedAt,
    },
    actor
  );
  const can = (a: WorkflowActionType) => actions.includes(a);

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(bangkokDateString());
  const [paymentType, setPaymentType] = useState<PaymentType>(task.paymentType);
  const [amount, setAmount] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [zeroAmount, setZeroAmount] = useState(false);
  const [history, setHistory] = useState<TaskStatusHistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(null);
    setShowHistory(false);
  }, [task.id]);

  function open(kind: DialogKind) {
    setDate(bangkokDateString());
    setPaymentType(task.paymentType);
    setAmount(task.taxAmount !== undefined ? String(task.taxAmount) : "");
    setFiles(kind === "CLIENT_PAID" ? task.clientSlipUrls : kind === "OFFICE_PAID" ? task.receiptUrls : []);
    setReason("");
    setZeroAmount(false);
    setDialog(kind);
  }

  async function send(action: WorkflowAction, successText: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.code === "ZERO_AMOUNT_OFFICE_PAYS") {
          setZeroAmount(true);
          return;
        }
        toast.error(json.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      toast.success(successText);
      setDialog(null);
      setHistory(null);
      onChanged(json.data as Task);
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory() {
    setShowHistory((v) => !v);
    if (history) return;
    const res = await fetch(`/api/tasks/${task.id}/history`);
    const json = await res.json().catch(() => ({}));
    setHistory(res.ok ? json.data : []);
  }

  function submitFile(type: PaymentType = paymentType) {
    const needsAmount = task.hasPayment && type === "OFFICE_PAYS";
    const parsed = amount.trim() === "" ? null : Number(amount.replace(/,/g, ""));
    if (needsAmount && (parsed === null || Number.isNaN(parsed))) {
      toast.error("กรุณาระบุยอดภาษีที่ต้องชำระ");
      return;
    }
    send(
      {
        type: "FILE",
        filedAt: date,
        ...(task.hasPayment ? { paymentType: type, taxAmount: parsed !== null && !Number.isNaN(parsed) ? parsed : null } : {}),
      },
      "บันทึกการยื่นแบบแล้ว"
    );
  }

  const fileLeadsTo: TaskStatus =
    task.hasPayment && paymentType === "OFFICE_PAYS" ? "AWAITING_CLIENT_PAYMENT" : "DONE";
  const waitingDays = task.docsRequestedAt && task.status === "WAITING_DOCS" ? -daysUntil(task.docsRequestedAt) : null;
  const steps = stepsFor(task);
  const currentIndex = steps.indexOf(task.status);

  return (
    <div className="space-y-3">
      {/* Step indicator */}
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className={cn(
                "text-[11px] px-2 py-1 rounded-md",
                i === currentIndex
                  ? "bg-primary text-primary-foreground font-semibold"
                  : i < currentIndex
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {STATUS_LABEL[s]}
            </span>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Payment type before filing (FR-76) */}
      {can("SET_PAYMENT_TYPE") && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">ประเภทการชำระ</Label>
          <Select
            value={task.paymentType}
            onValueChange={(v) =>
              send({ type: "SET_PAYMENT_TYPE", paymentType: v as PaymentType }, "เปลี่ยนประเภทการชำระแล้ว")
            }
            disabled={busy}
          >
            <SelectTrigger className="h-8 text-xs w-auto min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_PAYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {PAYMENT_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main actions */}
      <div className="flex gap-2 flex-wrap">
        {can("START") && (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() =>
              task.status === "WAITING_DOCS"
                ? open("START")
                : send({ type: "START" }, "เริ่มจัดทำแล้ว")
            }
          >
            <ChevronRight className="h-4 w-4" />
            {task.status === "WAITING_DOCS" ? "ได้รับเอกสารแล้ว" : "เริ่มจัดทำ"}
          </Button>
        )}
        {can("FILE") && (
          <Button
            size="sm"
            variant={task.status === "PROCESSING" ? "default" : "outline"}
            className="gap-1.5"
            disabled={busy}
            onClick={() => open("FILE")}
          >
            <FileCheck2 className="h-4 w-4" />
            ยื่นแบบแล้ว
          </Button>
        )}
        {can("REQUEST_DOCS") && (
          <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => open("REQUEST_DOCS")}>
            <FileClock className="h-4 w-4" />
            รอเอกสารจากลูกค้า
          </Button>
        )}
        {can("CLIENT_PAID") && (
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => open("CLIENT_PAID")}>
            <Wallet className="h-4 w-4" />
            ลูกค้าชำระแล้ว
          </Button>
        )}
        {can("OFFICE_PAID") && (
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => open("OFFICE_PAID")}>
            <Landmark className="h-4 w-4" />
            บันทึกการชำระ
          </Button>
        )}
        {task.status === "AWAITING_OFFICE_PAYMENT" && !isSupervisor && (
          <p className="text-xs text-muted-foreground self-center">รอผู้จัดการชำระภาษีและแนบใบเสร็จ</p>
        )}
        {can("NOT_FILING") && (
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" disabled={busy} onClick={() => open("NOT_FILING")}>
            <Ban className="h-4 w-4" />
            ไม่ยื่นเดือนนี้
          </Button>
        )}
        {can("REVERT") && (
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground ml-auto" disabled={busy} onClick={() => open("REVERT")}>
            <RotateCcw className="h-3.5 w-3.5" />
            ย้อนสถานะ
          </Button>
        )}
      </div>

      {/* What has been recorded so far */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {task.docsRequestedAt && (
          <Info label="ขอเอกสารเมื่อ">
            {formatThaiDate(task.docsRequestedAt)}
            {waitingDays !== null && waitingDays > 0 && (
              <span className="text-sky-700 dark:text-sky-400"> · รอมา {waitingDays} วัน</span>
            )}
          </Info>
        )}
        {task.docsReceivedAt && <Info label="ได้รับเอกสาร">{formatThaiDate(task.docsReceivedAt)}</Info>}
        {task.hasPayment && !can("SET_PAYMENT_TYPE") && (
          <Info label="ประเภทการชำระ">{PAYMENT_TYPE_LABEL[task.paymentType]}</Info>
        )}
        {task.filedAt && <Info label="ยื่นแบบเมื่อ">{formatThaiDate(task.filedAt)}</Info>}
        {task.hasPayment && task.taxAmount !== undefined && <Info label="ยอดภาษี">{baht(task.taxAmount)}</Info>}
        {task.clientPaidAt && (
          <Info label="ลูกค้าชำระเมื่อ">
            {formatThaiDate(task.clientPaidAt)}
            <FileLinks urls={task.clientSlipUrls} />
          </Info>
        )}
        {task.officePaidAt && (
          <Info label="หัวหน้าชำระเมื่อ">
            {formatThaiDate(task.officePaidAt)}
            <FileLinks urls={task.receiptUrls} />
          </Info>
        )}
        {task.notFilingReason && <Info label="เหตุผลที่ไม่ยื่น">{task.notFilingReason}</Info>}
        {!task.hasPayment && <Info label="การชำระ">งานนี้ไม่มีการชำระเงิน</Info>}
      </div>

      {/* Status history (FR-83) */}
      <div>
        <button type="button" onClick={loadHistory} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <History className="h-3.5 w-3.5" />
          {showHistory ? "ซ่อนประวัติสถานะ" : "ดูประวัติสถานะ"}
        </button>
        {showHistory && (
          <div className="mt-2 space-y-1 border-l pl-3">
            {history === null ? (
              <p className="text-xs text-muted-foreground">กำลังโหลด...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground">ยังไม่มีประวัติ (บันทึกตั้งแต่อัปเดตนี้เป็นต้นไป)</p>
            ) : (
              history.map((h) => (
                <p key={h.id} className="text-xs">
                  <span className="text-muted-foreground">
                    {new Date(h.changedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}
                  </span>{" "}
                  {h.fromStatus ? STATUS_LABEL[h.fromStatus] : "—"} → <span className="font-medium">{STATUS_LABEL[h.toStatus]}</span>{" "}
                  <span className="text-muted-foreground">โดย {h.changedByName}</span>
                  {h.reason && <span className="text-muted-foreground"> · {h.reason}</span>}
                </p>
              ))
            )}
          </div>
        )}
      </div>

      {/* Step dialogs */}
      <Dialog open={dialog !== null} onOpenChange={(v) => !v && !busy && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {dialog === "REQUEST_DOCS" && "รอเอกสารจากลูกค้า"}
              {dialog === "START" && "ได้รับเอกสารแล้ว"}
              {dialog === "FILE" && "ยื่นแบบแล้ว"}
              {dialog === "CLIENT_PAID" && "ลูกค้าชำระแล้ว"}
              {dialog === "OFFICE_PAID" && "บันทึกการชำระภาษี"}
              {dialog === "NOT_FILING" && "ไม่ยื่นเดือนนี้"}
              {dialog === "REVERT" && "ย้อนสถานะ"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">
              {task.taxType.name} · {clientLabel(task.client)}
            </p>

            {dialog && ["REQUEST_DOCS", "START", "FILE", "CLIENT_PAID", "OFFICE_PAID"].includes(dialog) && (
              <div className="space-y-1">
                <Label className="text-xs">
                  {dialog === "REQUEST_DOCS" && "วันที่ขอเอกสาร"}
                  {dialog === "START" && "วันที่ได้รับเอกสาร"}
                  {dialog === "FILE" && "วันที่ยื่นแบบ"}
                  {dialog === "CLIENT_PAID" && "วันที่รับเงินจากลูกค้า"}
                  {dialog === "OFFICE_PAID" && "วันที่ชำระ"}
                </Label>
                <Input type="date" value={date} max={bangkokDateString()} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}

            {dialog === "FILE" && task.hasPayment && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">ประเภทการชำระ</Label>
                  <Select value={paymentType} onValueChange={(v) => { setPaymentType(v as PaymentType); setZeroAmount(false); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_PAYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    ยอดภาษีที่ต้องชำระ (บาท){paymentType === "OFFICE_PAYS" ? " *" : " — ไม่บังคับ"}
                  </Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setZeroAmount(false); }}
                  />
                </div>
                {zeroAmount && (
                  <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 p-2 space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300">ยอดเป็น 0 — เปลี่ยนประเภทการชำระเป็น</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => { setPaymentType("NO_ADDITIONAL"); submitFile("NO_ADDITIONAL"); }}>
                        ไม่ต้องชำระเพิ่ม
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => { setPaymentType("NO_TAX"); submitFile("NO_TAX"); }}>
                        ไม่มีภาษีต้องชำระ
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            {dialog === "FILE" && (
              <p className="text-xs text-muted-foreground">
                บันทึกแล้วสถานะจะเป็น <span className="font-medium text-foreground">{STATUS_LABEL[fileLeadsTo]}</span>
              </p>
            )}

            {(dialog === "CLIENT_PAID" || dialog === "OFFICE_PAID") && (
              <div className="space-y-1">
                <Label className="text-xs">
                  {dialog === "CLIENT_PAID" ? "สลิปโอนเงินจากลูกค้า *" : "ใบเสร็จรับเงินจากหน่วยงานรัฐ *"}
                </Label>
                <PaymentFilesInput value={files} onChange={setFiles} />
                {task.taxAmount !== undefined && <p className="text-xs text-muted-foreground">ยอดภาษี {baht(task.taxAmount)}</p>}
              </div>
            )}

            {dialog === "NOT_FILING" && (
              <div className="space-y-1">
                <Label className="text-xs">เหตุผล *</Label>
                <Textarea
                  rows={2}
                  placeholder="เช่น เดือนนี้ไม่มีการจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่าย"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">ระบบจะหยุดแจ้งเตือนงานนี้ และไม่นับเป็นงานเกินกำหนด</p>
              </div>
            )}

            {dialog === "REVERT" && (
              <p className="text-sm">
                ย้อนจาก <span className="font-semibold">{STATUS_LABEL[task.status]}</span> กลับหนึ่งขั้น?
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog(null)}>
              ยกเลิก
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={busy}
              onClick={() => {
                if (dialog === "REQUEST_DOCS") send({ type: "REQUEST_DOCS", date }, "บันทึกรอเอกสารแล้ว");
                if (dialog === "START") send({ type: "START", docsReceivedAt: date }, "เริ่มจัดทำแล้ว");
                if (dialog === "FILE") submitFile();
                if (dialog === "CLIENT_PAID") send({ type: "CLIENT_PAID", date, slipUrls: files }, "บันทึกลูกค้าชำระแล้ว — แจ้งผู้จัดการแล้ว");
                if (dialog === "OFFICE_PAID") send({ type: "OFFICE_PAID", date, receiptUrls: files }, "บันทึกการชำระแล้ว — งานเสร็จสิ้น");
                if (dialog === "NOT_FILING") send({ type: "NOT_FILING", reason }, "บันทึกไม่ยื่นเดือนนี้แล้ว");
                if (dialog === "REVERT") send({ type: "REVERT" }, "ย้อนสถานะแล้ว");
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {busy ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <div className="font-medium mt-0.5">{children}</div>
    </div>
  );
}

