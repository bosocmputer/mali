"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PlusCircle, Loader2, Search, ChevronDown, X, CheckCircle2, SkipForward, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Client, User } from "@/types";
import { cn, MONTH_NAMES_TH } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const BACKFILL_YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR];

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
  const [hasNoTaskHistory, setHasNoTaskHistory] = useState(false);
  const [checkingHistory, setCheckingHistory] = useState(false);
  const [backfillMonth, setBackfillMonth] = useState("");
  const [backfillYear, setBackfillYear] = useState("");
  const [confirmSkipBackfill, setConfirmSkipBackfill] = useState(false);

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

  // Backfilling past months only works before a client's very first task is
  // generated — check whether this client already has any task at all so we
  // can show the option (and warn before it disappears for good).
  useEffect(() => {
    setBackfillMonth("");
    setBackfillYear("");
    if (!clientId) {
      setHasNoTaskHistory(false);
      return;
    }
    setCheckingHistory(true);
    fetch(`/api/tasks?clientId=${clientId}`)
      .then((r) => r.json())
      .then((j) => setHasNoTaskHistory((j.data ?? []).length === 0))
      .catch(() => setHasNoTaskHistory(false))
      .finally(() => setCheckingHistory(false));
  }, [clientId]);

  function handleCreateClick() {
    if (!clientId) return;
    // Backfilling past months only works this once — confirm before it's
    // skipped for good, same as the "generate tasks" flow on the Clients page.
    const choseBackfill = !!(backfillMonth && backfillYear);
    if (hasNoTaskHistory && !choseBackfill) {
      setConfirmSkipBackfill(true);
      return;
    }
    handleCreate();
  }

  async function handleCreate() {
    if (!clientId) return;
    setSaving(true);
    try {
      const backfillFrom =
        backfillMonth && backfillYear
          ? `${backfillYear}-${backfillMonth.padStart(2, "0")}-01`
          : undefined;
      const res = await fetch(`/api/clients/${clientId}/generate-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backfillFrom ? { backfillFrom } : {}),
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
    setConfirmSkipBackfill(false);
    onClose();
  }

  return (
    <Dialog open={open && !confirmSkipBackfill} onOpenChange={(v) => !v && handleClose()}>
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

            {selectedClient && checkingHistory && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                กำลังตรวจสอบประวัติงาน...
              </div>
            )}

            {selectedClient && !checkingHistory && hasNoTaskHistory && (
              <div className="space-y-1.5 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 p-3">
                <label className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  สร้างงานย้อนหลังตั้งแต่เดือน — เลือกได้ครั้งนี้ครั้งเดียว
                </label>
                <div className="flex gap-2">
                  <Select value={backfillMonth} onValueChange={setBackfillMonth}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="เดือน" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES_TH.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={backfillYear} onValueChange={setBackfillYear}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="ปี" />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKFILL_YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  บริษัทนี้ยังไม่มีงานในระบบเลย — ถ้ามีรายการภาษีที่ครบกำหนดไปแล้วก่อนวันนี้ ต้องเลือกเดือนย้อนหลังตอนนี้เท่านั้น
                  หลังจากกด &ldquo;สร้างงาน&rdquo; ไปแล้ว (ไม่ว่าจะเลือกย้อนหลังหรือไม่) จะไม่มีตัวเลือกนี้ให้เห็นอีก
                </p>
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
                onClick={handleCreateClick}
                disabled={!clientId || saving || checkingHistory}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {saving ? "กำลังสร้าง..." : "สร้างงาน"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Confirm skipping backfill — this choice cannot be revisited later */}
      <Dialog open={confirmSkipBackfill} onOpenChange={(v) => !v && setConfirmSkipBackfill(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Info className="h-4 w-4" />
              ยืนยันไม่สร้างงานย้อนหลัง
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              บริษัทนี้ยังไม่มีงานในระบบเลย นี่คือ<span className="font-medium text-foreground">ครั้งเดียว</span>ที่เลือกสร้างงานย้อนหลังได้
            </p>
            <p className="text-muted-foreground">
              ถ้ากด &ldquo;สร้างงาน&rdquo; ต่อโดยไม่เลือกเดือนย้อนหลัง ระบบจะสร้างแค่งานรอบปัจจุบันเท่านั้น และ<span className="font-medium text-foreground">จะไม่สามารถย้อนกลับมาเลือกสร้างงานย้อนหลังได้อีก</span> — ถ้ามีรายการภาษีที่ครบกำหนดไปแล้วก่อนหน้านี้ ต้องแก้ไขผ่านผู้ดูแลระบบเท่านั้น
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmSkipBackfill(false)}
            >
              กลับไปเลือกเดือนย้อนหลัง
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setConfirmSkipBackfill(false);
                handleCreate();
              }}
            >
              ยืนยัน สร้างเฉพาะรอบปัจจุบัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
