"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Client, User } from "@/types";
import { formatThaiDate } from "@/lib/utils";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  staffUsers: User[];
}

export function CreateTaskModal({
  open,
  onClose,
  onCreated,
  staffUsers,
}: CreateTaskModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [clientId, setClientId] = useState("");
  const [taxTypeId, setTaxTypeId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [fiscalYearEndDate, setFiscalYearEndDate] = useState("");
  const [previewDue, setPreviewDue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedTaxType = selectedClient?.taxTypes.find((t) => t.id === taxTypeId);

  // โหลด clients เมื่อ modal เปิด
  useEffect(() => {
    if (!open) return;
    setLoadingClients(true);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => setClients(j.data ?? []))
      .catch(() => toast.error("โหลดข้อมูลลูกค้าไม่ได้"))
      .finally(() => setLoadingClients(false));
  }, [open]);

  // reset เมื่อ modal ปิด
  useEffect(() => {
    if (!open) {
      setClientId("");
      setTaxTypeId("");
      setAssignedUserId("");
      setFiscalYearEndDate("");
      setPreviewDue(null);
    }
  }, [open]);

  // reset taxType และ auto-fill fiscalYearEndDate จาก client config เมื่อเปลี่ยน client
  useEffect(() => {
    setTaxTypeId("");
    setPreviewDue(null);
    if (selectedClient) {
      const month = selectedClient.fiscalYearEnd;
      const day = selectedClient.fiscalYearEndDay ?? new Date(Date.UTC(2000, month, 0)).getUTCDate();
      const year = new Date().getFullYear();
      // ถ้า fiscal year end เดือนน้อยกว่าปัจจุบัน ให้ใช้ปีนี้ (FY สิ้นสุดในอนาคต)
      const now = new Date();
      const candidateDate = new Date(Date.UTC(year, month - 1, day));
      const finalDate = candidateDate < now
        ? new Date(Date.UTC(year + 1, month - 1, day))
        : candidateDate;
      setFiscalYearEndDate(finalDate.toISOString().slice(0, 10));
    } else {
      setFiscalYearEndDate("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // preview due date เมื่อมีข้อมูลครบ
  useEffect(() => {
    if (!selectedTaxType || !fiscalYearEndDate) {
      setPreviewDue(null);
      return;
    }
    // คำนวณ preview จาก API
    const ctrl = new AbortController();
    fetch("/api/tasks/preview-due", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxTypeName: selectedTaxType.name, fiscalYearEndDate }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => j.dueDate && setPreviewDue(j.dueDate))
      .catch(() => null);
    return () => ctrl.abort();
  }, [selectedTaxType, fiscalYearEndDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !taxTypeId || !assignedUserId || !fiscalYearEndDate) {
      toast.error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, taxTypeId, assignedUserId, fiscalYearEndDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success("สร้างงานใหม่เรียบร้อยแล้ว");
        onCreated();
        onClose();
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PlusCircle className="h-4 w-4 text-primary" />
            สร้างงานใหม่
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>ผู้ประกอบการ / บริษัท</Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลด...
              </div>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบริษัท..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tax Type — แสดงเมื่อเลือก client แล้ว */}
          <div className="space-y-1.5">
            <Label>ประเภทภาษี</Label>
            <Select
              value={taxTypeId}
              onValueChange={setTaxTypeId}
              disabled={!selectedClient}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedClient ? "เลือกประเภทภาษี..." : "เลือกบริษัทก่อน"} />
              </SelectTrigger>
              <SelectContent>
                {selectedClient?.taxTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-2">
                      {t.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t.frequency === "MONTHLY" ? "รายเดือน" : "รายปี"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fiscal Year End Date */}
          <div className="space-y-1.5">
            <Label>วันสิ้นรอบภาษี (Base Date)</Label>
            <Input
              type="date"
              value={fiscalYearEndDate}
              onChange={(e) => setFiscalYearEndDate(e.target.value)}
              disabled={!selectedTaxType}
            />
            {selectedClient && (
              <p className="text-xs text-muted-foreground">
                รอบบัญชี: เดือน {selectedClient.fiscalYearStart} — วันที่ {selectedClient.fiscalYearEndDay ?? ""} เดือน {selectedClient.fiscalYearEnd} (กรอกอัตโนมัติ — แก้ไขได้)
              </p>
            )}
          </div>

          {/* Due Date Preview */}
          {previewDue && (
            <>
              <Separator />
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
                <p className="text-xs text-blue-600 font-medium mb-1">
                  วันครบกำหนด (คำนวณอัตโนมัติ)
                </p>
                <p className="text-blue-900 font-semibold text-base">
                  {formatThaiDate(previewDue)}
                </p>
                {selectedTaxType && (
                  <p className="text-xs text-blue-500 mt-1">
                    กฎ: {selectedTaxType.name}
                  </p>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Assigned Staff */}
          <div className="space-y-1.5">
            <Label>มอบหมายให้</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกผู้รับผิดชอบ..." />
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              {saving ? "กำลังสร้าง..." : "สร้างงาน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
