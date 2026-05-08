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
import { Client, Team, User } from "@/types";
import {
  TAX_TYPE_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  MONTH_NAMES_TH,
} from "@/lib/utils";

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  teams?: Team[];
  staffUsers?: User[];
}

const DEFAULT_FORM = {
  companyName: "",
  taxId: "",
  businessType: "",
  filingMethod: "" as "" | "PAPER" | "E_FILING",
  fiscalYearStart: "1",
  fiscalYearEnd: "12",
  fiscalYearEndDay: "31",
  teamId: "",
  assignedStaffId: "",
  selectedTaxTypes: [] as string[],
};

export function ClientModal({ open, onClose, client, teams = [], staffUsers = [] }: ClientModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setForm({
        companyName: client.companyName,
        taxId: client.taxId ?? "",
        businessType: client.businessType,
        filingMethod: (client.filingMethod as "" | "PAPER" | "E_FILING") ?? "",
        fiscalYearStart: String(client.fiscalYearStart),
        fiscalYearEnd: String(client.fiscalYearEnd),
        fiscalYearEndDay: String(client.fiscalYearEndDay ?? 31),
        teamId: client.teamId ?? "",
        assignedStaffId: client.assignedStaffId ?? "",
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
    if (form.taxId && !/^\d{13}$/.test(form.taxId)) {
      setError("เลขนิติบุคคลต้องเป็นตัวเลข 13 หลัก");
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
    if (Number(form.fiscalYearStart) === Number(form.fiscalYearEnd)) {
      setError("รอบบัญชีเริ่มต้นและสิ้นสุดต้องไม่เป็นเดือนเดียวกัน");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      ...(client ? { id: client.id } : {}),
      companyName: form.companyName.trim(),
      taxId: form.taxId.trim() || undefined,
      businessType: form.businessType,
      filingMethod: form.filingMethod || undefined,
      fiscalYearStart: Number(form.fiscalYearStart),
      fiscalYearEnd: Number(form.fiscalYearEnd),
      fiscalYearEndDay: Number(form.fiscalYearEndDay),
      teamId: form.teamId || undefined,
      assignedStaffId: form.assignedStaffId || undefined,
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

          {/* Tax ID */}
          <div className="space-y-1.5">
            <Label htmlFor="taxId">เลขนิติบุคคล (13 หลัก)</Label>
            <Input
              id="taxId"
              value={form.taxId}
              onChange={(e) =>
                setForm((p) => ({ ...p, taxId: e.target.value.replace(/\D/g, "").slice(0, 13) }))
              }
              placeholder="0105567012345"
              maxLength={13}
              inputMode="numeric"
            />
          </div>

          {/* Filing Method */}
          <div className="space-y-1.5">
            <Label>วิธียื่นแบบ</Label>
            <Select
              value={form.filingMethod || "_none"}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, filingMethod: v === "_none" ? "" : (v as "PAPER" | "E_FILING") }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="ไม่ระบุ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">ไม่ระบุ</SelectItem>
                <SelectItem value="E_FILING">E-Filing (ยื่นออนไลน์)</SelectItem>
                <SelectItem value="PAPER">Paper (ยื่นกระดาษ)</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Fiscal Year End Day */}
          <div className="space-y-1.5">
            <Label>วันที่สิ้นรอบบัญชี</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={31}
                value={form.fiscalYearEndDay}
                onChange={(e) => {
                  const v = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                  setForm((p) => ({ ...p, fiscalYearEndDay: String(v) }));
                }}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">
                {MONTH_NAMES_TH[Number(form.fiscalYearEnd) - 1]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ระบบจะใช้วันนี้คำนวณ due date อัตโนมัติเมื่อสร้างงาน
            </p>
          </div>

          {isNonStandard && (
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="text-amber-700 text-xs">
                รอบบัญชีไม่ตรงกับปีปฏิทิน (Non-Standard Fiscal Year)
              </p>
            </div>
          )}

          {/* Staff Assignment */}
          {staffUsers.length > 0 && (
            <div className="space-y-1.5">
              <Label>มอบหมายงานให้เจ้าหน้าที่</Label>
              <Select
                value={form.assignedStaffId}
                onValueChange={(v) => setForm((p) => ({ ...p, assignedStaffId: v === "_none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ไม่ระบุเจ้าหน้าที่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">ไม่ระบุ</SelectItem>
                  {staffUsers.filter((u) => u.role === "STAFF").map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                เจ้าหน้าที่ที่รับผิดชอบงานของผู้ประกอบการนี้
              </p>
            </div>
          )}

          {/* Team Assignment */}
          {teams.length > 0 && (
            <div className="space-y-1.5">
              <Label>ทีมที่ดูแล</Label>
              <Select
                value={form.teamId}
                onValueChange={(v) => setForm((p) => ({ ...p, teamId: v === "_none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ไม่ระบุทีม" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">ไม่ระบุทีม</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                หัวหน้าทีมจะได้รับ escalation เมื่องานยังไม่เสร็จก่อนครบกำหนด 1 วัน
              </p>
            </div>
          )}

          {/* Tax Types */}
          <div className="space-y-2">
            <Label>ประเภทภาษี * (เลือกได้หลายประเภท)</Label>
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
              {TAX_TYPE_OPTIONS.map((opt) => {
                const selected = form.selectedTaxTypes.includes(opt.value);
                const [code, ...descParts] = opt.label.split(" — ");
                const desc = descParts.join(" — ");
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleTaxType(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
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
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      {code}
                    </span>
                    <span className="truncate text-xs">{desc}</span>
                    <Badge
                      variant="outline"
                      className="ml-auto flex-shrink-0 text-xs py-0 h-4"
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
