"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Rule } from "@/types";

interface RuleModalProps {
  open: boolean;
  onClose: () => void;
  rule?: Rule | null;
}

type CalcMethod = "fixed_day" | "offset_days" | "offset_months";
type RefDate = "month_end" | "fiscal_year_end" | "agm_date";

const DEFAULT = {
  ruleCode: "",
  name: "",
  taxForm: "",
  calcMethod: "fixed_day" as CalcMethod,
  fixedDay: "15",
  offset: "",
  referenceDate: "month_end" as RefDate,
  legalRef: "",
  description: "",
};

export function RuleModal({ open, rule, onClose }: RuleModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rule) {
      setForm({
        ruleCode: rule.ruleCode,
        name: rule.name,
        taxForm: rule.taxForm ?? "",
        calcMethod: (rule.calcMethod as CalcMethod) ?? "fixed_day",
        fixedDay: String(rule.fixedDay ?? 15),
        offset: String(rule.offset ?? ""),
        referenceDate: (rule.referenceDate as RefDate) ?? "month_end",
        legalRef: rule.legalRef,
        description: rule.description ?? "",
      });
    } else {
      setForm(DEFAULT);
    }
    setError(null);
  }, [rule, open]);

  function handleClose() {
    setForm(DEFAULT);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ruleCode || !form.name || !form.legalRef) {
      setError("กรุณากรอก รหัสเกณฑ์, ชื่อรายการ และอ้างอิงกฎหมาย");
      return;
    }
    if (form.calcMethod === "fixed_day" && (!form.fixedDay || Number(form.fixedDay) < 1 || Number(form.fixedDay) > 31)) {
      setError("วันที่คงที่ต้องอยู่ระหว่าง 1–31");
      return;
    }
    if ((form.calcMethod === "offset_days" || form.calcMethod === "offset_months") && !form.offset) {
      setError("กรุณาระบุจำนวนวัน/เดือน");
      return;
    }

    setLoading(true);
    setError(null);
    const payload = {
      ...(rule ? { id: rule.id } : {}),
      ruleCode: form.ruleCode.trim(),
      name: form.name.trim(),
      taxForm: form.taxForm.trim() || null,
      calcMethod: form.calcMethod,
      fixedDay: form.calcMethod === "fixed_day" ? Number(form.fixedDay) : null,
      offset: form.calcMethod !== "fixed_day" ? Number(form.offset) : null,
      referenceDate: form.referenceDate,
      legalRef: form.legalRef.trim(),
      description: form.description.trim() || null,
    };

    try {
      const res = await fetch("/api/rules", {
        method: rule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success(rule ? "แก้ไขเกณฑ์เรียบร้อยแล้ว" : "เพิ่มเกณฑ์ใหม่เรียบร้อยแล้ว");
        router.refresh();
        handleClose();
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            {rule ? "แก้ไขเกณฑ์" : "เพิ่มเกณฑ์ใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {rule && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                การแก้ไขกฎนี้จะมีผลกับ<span className="font-semibold">งานที่สร้างใหม่เท่านั้น</span> — งานที่มีอยู่แล้วในระบบจะไม่ถูกเปลี่ยนวันครบกำหนดโดยอัตโนมัติ
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>รหัสเกณฑ์ *</Label>
              <Input
                placeholder="R-16"
                value={form.ruleCode}
                onChange={(e) => setForm((p) => ({ ...p, ruleCode: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>แบบฟอร์มภาษี</Label>
              <Input
                placeholder="ภ.ง.ด.50"
                value={form.taxForm}
                onChange={(e) => setForm((p) => ({ ...p, taxForm: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>ชื่อรายการ *</Label>
            <Input
              placeholder="ภาษีเงินได้นิติบุคคล"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>วิธีคำนวณ *</Label>
            <Select
              value={form.calcMethod}
              onValueChange={(v) => setForm((p) => ({ ...p, calcMethod: v as CalcMethod }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_day">วันที่คงที่ของเดือน</SelectItem>
                <SelectItem value="offset_days">บวกจำนวนวันจากวันอ้างอิง</SelectItem>
                <SelectItem value="offset_months">บวกจำนวนเดือนจากวันอ้างอิง</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.calcMethod === "fixed_day" ? (
            <div className="space-y-1.5">
              <Label>ระบุวันที่ครบกำหนด *</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.fixedDay}
                onChange={(e) => setForm((p) => ({ ...p, fixedDay: e.target.value }))}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">ระบบจะใช้วันที่นี้ของเดือนถัดไปเป็นกำหนดส่ง</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>จำนวน{form.calcMethod === "offset_days" ? "วัน" : "เดือน"} *</Label>
              <Input
                type="number"
                min={1}
                value={form.offset}
                onChange={(e) => setForm((p) => ({ ...p, offset: e.target.value }))}
                placeholder={form.calcMethod === "offset_days" ? "150" : "5"}
                className="w-24"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>เริ่มนับจาก *</Label>
            <Select
              value={form.referenceDate}
              onValueChange={(v) => setForm((p) => ({ ...p, referenceDate: v as RefDate }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month_end">สิ้นเดือน</SelectItem>
                <SelectItem value="fiscal_year_end">สิ้นรอบบัญชี</SelectItem>
                <SelectItem value="agm_date">วันประชุมผู้ถือหุ้น (AGM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>อ้างอิงกฎหมาย *</Label>
            <Input
              placeholder="ป.รัษฎากร ม.68, 69"
              value={form.legalRef}
              onChange={(e) => setForm((p) => ({ ...p, legalRef: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>คำอธิบาย (ไม่บังคับ)</Label>
            <Input
              placeholder="ยื่นภายใน 150 วันหลังสิ้นรอบบัญชี"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>ยกเลิก</Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              {loading ? "กำลังบันทึก..." : rule ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มเกณฑ์"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
