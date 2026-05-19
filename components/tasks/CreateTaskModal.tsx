"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PlusCircle, Loader2, Search, ChevronDown, X } from "lucide-react";
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
import { formatThaiDate, cn } from "@/lib/utils";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  staffUsers: User[];
}

// Searchable client combobox
function ClientCombobox({
  clients,
  value,
  onChange,
  disabled,
}: {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = clients.find((c) => c.id === value);
  const filtered = clients.filter((c) =>
    c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  // ปิดเมื่อคลิกนอก
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-md border border-input bg-background text-sm shadow-sm transition-colors",
          "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.companyName : "เลือกบริษัท..."}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              aria-label="ล้างการเลือก"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); setSearch(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); }}}
              className="p-0.5 rounded hover:bg-secondary text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="ค้นหาบริษัท..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div role="listbox" aria-label="รายชื่อบริษัท" className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">ไม่พบบริษัท</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={c.id === value ? true : false}
                  onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 transition-colors",
                    c.id === value && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  {c.companyName}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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

  useEffect(() => {
    if (!open) return;
    setLoadingClients(true);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => setClients(j.data ?? []))
      .catch(() => toast.error("โหลดข้อมูลลูกค้าไม่ได้"))
      .finally(() => setLoadingClients(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setClientId("");
      setTaxTypeId("");
      setAssignedUserId("");
      setFiscalYearEndDate("");
      setPreviewDue(null);
    }
  }, [open]);

  useEffect(() => {
    setTaxTypeId("");
    setPreviewDue(null);
    if (selectedClient) {
      const month = selectedClient.fiscalYearEnd;
      const day = selectedClient.fiscalYearEndDay ?? new Date(Date.UTC(2000, month, 0)).getUTCDate();
      const year = new Date().getFullYear();
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

  useEffect(() => {
    if (!selectedTaxType || !fiscalYearEndDate) {
      setPreviewDue(null);
      return;
    }
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
          {/* Client — searchable */}
          <div className="space-y-1.5">
            <Label>ลูกค้า / บริษัท</Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลด...
              </div>
            ) : (
              <ClientCombobox
                clients={clients}
                value={clientId}
                onChange={setClientId}
              />
            )}
          </div>

          {/* Tax Type */}
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
            <Label>วันสิ้นรอบบัญชี</Label>
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
            <Button type="button" variant="outline" size="default" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" size="default" disabled={saving} className="gap-2">
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
