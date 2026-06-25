"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle2, CalendarDays, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ThaiHoliday } from "@/types";

interface GoogleHolidayItem {
  date: string;
  name_th: string;
  name_en: string;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1];

interface SyncHolidayModalProps {
  open: boolean;
  onClose: () => void;
  existingHolidays: ThaiHoliday[];
}

export function SyncHolidayModal({ open, onClose, existingHolidays }: SyncHolidayModalProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [importing, setImporting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [googleItems, setGoogleItems] = useState<GoogleHolidayItem[]>([]);

  const existingDates = new Set(existingHolidays.map((h) => h.date));
  const duplicates = googleItems.filter((h) => existingDates.has(h.date));
  const newItems = googleItems.filter((h) => !existingDates.has(h.date));

  useEffect(() => {
    if (!open) return;
    loadGoogleHolidays(selectedYear);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedYear]);

  async function loadGoogleHolidays(year: number) {
    setFetching(true);
    setFetchError(null);
    setGoogleItems([]);
    try {
      const res = await fetch(`/api/holidays/google?year=${year}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error ?? "ดึงข้อมูลไม่สำเร็จ");
      } else {
        setGoogleItems(json.items ?? []);
      }
    } catch {
      setFetchError("ไม่สามารถเชื่อมต่อ Google Calendar API ได้");
    } finally {
      setFetching(false);
    }
  }

  function formatDate(dateStr: string) {
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/holidays/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear, items: newItems }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง");
      } else {
        toast.success(`Sync สำเร็จ เพิ่ม ${json.added ?? newItems.length} รายการ`);
        router.refresh();
        onClose();
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            Sync วันหยุดราชการ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Source badge */}
          <div className="flex gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
            <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              ดึงข้อมูลจาก <strong>Google Calendar — วันหยุดในไทย</strong> แบบ real-time
              (เฉพาะ วันหยุดนักขัตฤกษ์ ไม่รวมวันสำคัญอื่น)
            </span>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">เลือกปี:</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
              disabled={fetching}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y + 543} ({y})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!fetching && !fetchError && googleItems.length > 0 && (
              <span className="text-xs text-muted-foreground">พบ {googleItems.length} รายการ</span>
            )}
          </div>

          {/* Loading state */}
          {fetching && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังดึงข้อมูลจาก Google Calendar...
            </div>
          )}

          {/* Error state */}
          {!fetching && fetchError && (
            <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Preview list */}
          {!fetching && !fetchError && googleItems.length > 0 && (
            <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
              {googleItems.map((h) => {
                const isDup = existingDates.has(h.date);
                return (
                  <div key={h.date} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="font-mono text-muted-foreground w-10 flex-shrink-0">{formatDate(h.date)}</span>
                    <span className="flex-1 truncate">{h.name_th}</span>
                    {isDup && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0">
                        มีแล้ว
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Duplicate warning */}
          {!fetching && duplicates.length > 0 && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                พบ {duplicates.length} รายการที่มีในระบบแล้ว — จะข้ามรายการซ้ำ และนำเข้าเฉพาะ {newItems.length} รายการใหม่
              </span>
            </div>
          )}

          {!fetching && !fetchError && googleItems.length > 0 && newItems.length === 0 && (
            <div className="flex gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>วันหยุดปี {selectedYear + 543} มีในระบบครบแล้ว</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
            <Button
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleImport}
              disabled={importing || fetching || !!fetchError || newItems.length === 0}
            >
              <CalendarDays className="h-4 w-4" />
              {importing ? "กำลังนำเข้า..." : `นำเข้าข้อมูล (${newItems.length} รายการ)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
