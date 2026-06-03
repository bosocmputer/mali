"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PlusCircle, Loader2, Search, ChevronDown, X, CheckCircle2, SkipForward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Client, User } from "@/types";
import { cn } from "@/lib/utils";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  staffUsers: User[];
}

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
          {selected ? selected.companyName : "เลือกบริษัท/ห้างหุ้นส่วนฯ..."}
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
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
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
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">ไม่พบบริษัท</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                    c.id === value && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <p>{c.companyName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.taxTypes.length} ประเภทภาษี
                  </p>
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
}: CreateTaskModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);

  useEffect(() => {
    if (!open) return;
    setLoadingClients(true);
    setResult(null);
    setClientId("");
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => setClients(j.data ?? []))
      .catch(() => toast.error("โหลดข้อมูลบริษัทไม่ได้"))
      .finally(() => setLoadingClients(false));
  }, [open]);

  async function handleCreate() {
    if (!clientId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/generate-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        setResult({ created: json.created ?? 0, skipped: json.skipped ?? 0 });
        if ((json.created ?? 0) > 0) {
          toast.success(`สร้างงานใหม่ ${json.created} รายการเรียบร้อยแล้ว`);
          onCreated();
        } else {
          toast.info("งานทุกรายการมีอยู่ในระบบแล้ว — ไม่มีงานใหม่ที่ต้องสร้าง");
        }
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setResult(null);
    setClientId("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PlusCircle className="h-4 w-4 text-primary" />
            สร้างงานทันที
          </DialogTitle>
        </DialogHeader>

        {result ? (
          /* หลังสร้างเสร็จ — แสดงผลลัพธ์ */
          <div className="py-4 space-y-3 text-center">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground">เสร็จเรียบร้อย</p>
              <p className="text-sm text-muted-foreground mt-1">{selectedClient?.companyName}</p>
            </div>
            <div className="flex justify-center gap-4 text-sm">
              {result.created > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  สร้างใหม่ {result.created} งาน
                </div>
              )}
              {result.skipped > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <SkipForward className="h-4 w-4" />
                  มีอยู่แล้ว {result.skipped} งาน
                </div>
              )}
              {result.created === 0 && result.skipped === 0 && (
                <p className="text-muted-foreground text-xs">ไม่มีงานที่ต้องสร้าง</p>
              )}
            </div>
          </div>
        ) : (
          /* เลือกบริษัท */
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              เลือกบริษัท — ระบบจะสร้างงานทุกประเภทภาษีให้อัตโนมัติ เหมือนกับที่ cron รันทุกคืน
            </p>

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

            {selectedClient && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{selectedClient.companyName}</p>
                <p>ประเภทภาษี: {selectedClient.taxTypes.map((t) => t.name).join(", ")}</p>
                <p className="text-primary">จะสร้างงานที่ยังไม่มีในระบบเท่านั้น — งานที่มีอยู่แล้วจะถูกข้าม</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>ปิด</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>ยกเลิก</Button>
              <Button
                onClick={handleCreate}
                disabled={!clientId || saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {saving ? "กำลังสร้าง..." : "สร้างงาน"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
