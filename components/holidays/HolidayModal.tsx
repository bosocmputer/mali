"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ThaiHoliday } from "@/types";

interface HolidayModalProps {
  open: boolean;
  onClose: () => void;
}

const HOLIDAY_TYPES: { value: ThaiHoliday["type"]; label: string }[] = [
  { value: "public_holiday",       label: "วันหยุดนักขัตฤกษ์" },
  { value: "special_holiday",      label: "วันหยุดพิเศษ (ครม.)" },
  { value: "government_holiday",   label: "วันหยุดราชการ" },
  { value: "substitution_holiday", label: "วันหยุดชดเชย" },
];

const DEFAULT = { date: "", name_th: "", name_en: "", type: "public_holiday" as ThaiHoliday["type"], is_substitution: false, note: "" };

export function HolidayModal({ open, onClose }: HolidayModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setForm(DEFAULT);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.name_th || !form.name_en || !form.type) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          is_substitution: form.type === "substitution_holiday",
          note: form.note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success("เพิ่มวันหยุดเรียบร้อยแล้ว");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarPlus className="h-4 w-4 text-primary" />
            เพิ่มวันหยุดใหม่
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>วันที่ *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>ชื่อวันหยุด (ภาษาไทย) *</Label>
            <Input
              placeholder="วันขึ้นปีใหม่"
              value={form.name_th}
              onChange={(e) => setForm((p) => ({ ...p, name_th: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>ชื่อวันหยุด (English) *</Label>
            <Input
              placeholder="New Year's Day"
              value={form.name_en}
              onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>ประเภท *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((p) => ({ ...p, type: v as ThaiHoliday["type"] }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>หมายเหตุ (ไม่บังคับ)</Label>
            <Input
              placeholder="เช่น ชดเชยวันหยุดที่ตรงกับวันอาทิตย์"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              {loading ? "กำลังบันทึก..." : "เพิ่มวันหยุด"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
