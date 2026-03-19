"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Client } from "@/types";
import {
  TAX_TYPE_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  MONTH_NAMES_TH,
} from "@/lib/utils";

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
}

const DEFAULT_FORM = {
  companyName: "",
  businessType: "",
  fiscalYearStart: "1",
  fiscalYearEnd: "12",
  selectedTaxTypes: [] as string[],
};

export function ClientModal({ open, onClose, client }: ClientModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setForm({
        companyName: client.companyName,
        businessType: client.businessType,
        fiscalYearStart: String(client.fiscalYearStart),
        fiscalYearEnd: String(client.fiscalYearEnd),
        selectedTaxTypes: client.taxTypes.map((t) => t.name),
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setError(null);
  }, [client, open]);

  function toggleTaxType(name: string) {
    setForm((prev) => ({
      ...prev,
      selectedTaxTypes: prev.selectedTaxTypes.includes(name)
        ? prev.selectedTaxTypes.filter((t) => t !== name)
        : [...prev.selectedTaxTypes, name],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError("กรุณากรอกชื่อบริษัท");
      return;
    }
    if (!form.businessType) {
      setError("กรุณาเลือกประเภทธุรกิจ");
      return;
    }
    if (form.selectedTaxTypes.length === 0) {
      setError("กรุณาเลือกอย่างน้อย 1 ประเภทภาษี");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      ...(client ? { id: client.id } : {}),
      companyName: form.companyName.trim(),
      businessType: form.businessType,
      fiscalYearStart: Number(form.fiscalYearStart),
      fiscalYearEnd: Number(form.fiscalYearEnd),
      isNonStandard: Number(form.fiscalYearEnd) !== 12,
      taxTypes: form.selectedTaxTypes.map((name) => {
        const opt = TAX_TYPE_OPTIONS.find((o) => o.value === name);
        return { name, frequency: opt?.frequency ?? "ANNUAL" };
      }),
    };

    try {
      const res = await fetch("/api/clients", {
        method: client ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success(client ? "แก้ไขข้อมูลเรียบร้อยแล้ว" : "เพิ่มผู้ประกอบการเรียบร้อยแล้ว");
        router.refresh();
        onClose();
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoading(false);
    }
  }

  const isNonStandard = Number(form.fiscalYearEnd) !== 12;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? "แก้ไขข้อมูลผู้ประกอบการ" : "เพิ่มผู้ประกอบการใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="companyName">ชื่อบริษัท / ห้างหุ้นส่วน *</Label>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={(e) =>
                setForm((p) => ({ ...p, companyName: e.target.value }))
              }
              placeholder="บริษัท ตัวอย่าง จำกัด"
              required
            />
          </div>

          {/* Business Type */}
          <div className="space-y-1.5">
            <Label>ประเภทธุรกิจ *</Label>
            <Select
              value={form.businessType}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, businessType: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทธุรกิจ" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPE_OPTIONS.map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fiscal Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>รอบบัญชีเริ่มต้น</Label>
              <Select
                value={form.fiscalYearStart}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, fiscalYearStart: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES_TH.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>รอบบัญชีสิ้นสุด</Label>
              <Select
                value={form.fiscalYearEnd}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, fiscalYearEnd: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES_TH.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isNonStandard && (
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="text-amber-700 text-xs">
                รอบบัญชีไม่ตรงกับปีปฏิทิน (Non-Standard Fiscal Year)
              </p>
            </div>
          )}

          {/* Tax Types */}
          <div className="space-y-2">
            <Label>ประเภทภาษี * (เลือกได้หลายประเภท)</Label>
            <div className="grid grid-cols-2 gap-2">
              {TAX_TYPE_OPTIONS.map((opt) => {
                const selected = form.selectedTaxTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleTaxType(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      selected
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "bg-white border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {selected && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 12 12"
                        >
                          <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      )}
                    </span>
                    <span>{opt.label}</span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-xs py-0 h-4"
                    >
                      {opt.frequency === "ANNUAL" ? "รายปี" : "รายเดือน"}
                    </Badge>
                  </button>
                );
              })}
            </div>
            {form.selectedTaxTypes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                เลือกแล้ว: {form.selectedTaxTypes.join(", ")}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "กำลังบันทึก..."
                : client
                ? "บันทึกการเปลี่ยนแปลง"
                : "เพิ่มผู้ประกอบการ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
