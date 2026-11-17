"use client";

import { useState } from "react";
import { AlertTriangle, FileSignature, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUDITED_STATEMENT_FORMS } from "@/lib/taskWorkflow";
import { lateness } from "@/lib/taskLateness";
import type { Task } from "@/types";

/**
 * FR-101: auditor steps for annual statements. FR-102: penalty and surcharge when filing or
 * paying was late (shown only when the dates say so, or something was already recorded).
 */
export function TaskExtrasPanel({ task, onChanged }: { task: Task; onChanged: (t: Task) => void }) {
  const late = lateness(task);
  const hasPenalty = task.penaltyAmount !== undefined || task.surchargeAmount !== undefined || !!task.penaltyReason;
  const isStatements = AUDITED_STATEMENT_FORMS.includes(task.taxType.name);

  const [penalty, setPenalty] = useState(task.penaltyAmount?.toString() ?? "");
  const [surcharge, setSurcharge] = useState(task.surchargeAmount?.toString() ?? "");
  const [borneBy, setBorneBy] = useState<string>(task.penaltyBorneBy ?? "");
  const [reason, setReason] = useState(task.penaltyReason ?? "");
  const [busy, setBusy] = useState(false);

  if (!isStatements && !late.late && !hasPenalty) return null;

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "บันทึกไม่สำเร็จ");
      toast.success(ok);
      onChanged(json.data as Task);
    } finally {
      setBusy(false);
    }
  }

  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/,/g, "")));

  return (
    <div className="space-y-3">
      {isStatements && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <FileSignature className="h-4 w-4 text-primary" />
            ผู้สอบบัญชี: {task.client.auditorName ?? <span className="text-muted-foreground font-normal">ยังไม่ระบุในข้อมูลบริษัท</span>}
            {task.client.auditFeeEstimate !== undefined && (
              <span className="text-muted-foreground font-normal">
                · ประมาณการค่าสอบ {task.client.auditFeeEstimate.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">ส่งงบให้ผู้สอบบัญชีแล้ว</Label>
              <Input
                type="date"
                defaultValue={task.auditorSentAt ?? ""}
                disabled={busy}
                onChange={(e) => patch({ auditorSentAt: e.target.value || null }, "บันทึกวันที่ส่งงบแล้ว")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ได้รับรายงานผู้สอบบัญชีแล้ว</Label>
              <Input
                type="date"
                defaultValue={task.auditorReportAt ?? ""}
                disabled={busy}
                onChange={(e) => patch({ auditorReportAt: e.target.value || null }, "บันทึกวันที่ได้รับรายงานแล้ว")}
              />
            </div>
          </div>
        </div>
      )}

      {(late.late || hasPenalty) && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {[late.lateFiling && "ยื่นล่าช้า", late.latePayment && "ชำระล่าช้า"].filter(Boolean).join(" · ") || "เบี้ยปรับ / เงินเพิ่ม"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">เบี้ยปรับ (บาท)</Label>
              <Input inputMode="decimal" value={penalty} onChange={(e) => setPenalty(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">เงินเพิ่ม (บาท)</Label>
              <Input inputMode="decimal" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ผู้รับภาระ</Label>
              <Select value={borneBy || "_none"} onValueChange={(v) => setBorneBy(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">ยังไม่ระบุ</SelectItem>
                  <SelectItem value="CLIENT">ลูกค้า</SelectItem>
                  <SelectItem value="OFFICE">สำนักงาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">สาเหตุ</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ลูกค้าส่งเอกสารช้า" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={busy}
              onClick={() => {
                const p = num(penalty);
                const s = num(surcharge);
                if ((p !== null && Number.isNaN(p)) || (s !== null && Number.isNaN(s))) return toast.error("ยอดต้องเป็นตัวเลข");
                patch(
                  { penaltyAmount: p, surchargeAmount: s, penaltyBorneBy: borneBy || null, penaltyReason: reason || null },
                  "บันทึกเบี้ยปรับแล้ว"
                );
              }}
            >
              <Save className="h-4 w-4" />
              บันทึก
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
