"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle2, CalendarDays } from "lucide-react";
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

// Mock วันหยุดไทย 2568–2569 (ก่อน integrate Google Calendar API จริง)
const MOCK_THAI_HOLIDAYS: Record<number, { date: string; name_th: string; name_en: string }[]> = {
  2568: [
    { date: "2025-01-01", name_th: "วันขึ้นปีใหม่",              name_en: "New Year's Day" },
    { date: "2025-02-12", name_th: "วันมาฆบูชา",                 name_en: "Makha Bucha Day" },
    { date: "2025-04-06", name_th: "วันจักรี",                   name_en: "Chakri Day" },
    { date: "2025-04-07", name_th: "วันหยุดชดเชยวันจักรี",       name_en: "Chakri Day (Substitution)" },
    { date: "2025-04-13", name_th: "วันสงกรานต์",                name_en: "Songkran Festival" },
    { date: "2025-04-14", name_th: "วันสงกรานต์",                name_en: "Songkran Festival" },
    { date: "2025-04-15", name_th: "วันสงกรานต์",                name_en: "Songkran Festival" },
    { date: "2025-05-01", name_th: "วันแรงงานแห่งชาติ",         name_en: "National Labour Day" },
    { date: "2025-05-05", name_th: "วันฉัตรมงคล",               name_en: "Coronation Day" },
    { date: "2025-05-12", name_th: "วันวิสาขบูชา",              name_en: "Visakha Bucha Day" },
    { date: "2025-06-03", name_th: "วันเฉลิมพระชนมพรรษา สมเด็จพระราชินี", name_en: "HM The Queen's Birthday" },
    { date: "2025-07-10", name_th: "วันอาสาฬหบูชา",             name_en: "Asalha Bucha Day" },
    { date: "2025-07-11", name_th: "วันเข้าพรรษา",              name_en: "Buddhist Lent Day" },
    { date: "2025-07-28", name_th: "วันเฉลิมพระชนมพรรษา รัชกาลที่ 10", name_en: "HM King's Birthday" },
    { date: "2025-08-12", name_th: "วันแม่แห่งชาติ",            name_en: "HM Queen Mother's Birthday / Mother's Day" },
    { date: "2025-10-13", name_th: "วันคล้ายวันสวรรคต รัชกาลที่ 9", name_en: "HM King Bhumibol Memorial Day" },
    { date: "2025-10-23", name_th: "วันปิยมหาราช",              name_en: "Chulalongkorn Day" },
    { date: "2025-12-05", name_th: "วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 / วันพ่อแห่งชาติ", name_en: "HM King Bhumibol Birthday / Father's Day" },
    { date: "2025-12-10", name_th: "วันรัฐธรรมนูญ",             name_en: "Constitution Day" },
    { date: "2025-12-31", name_th: "วันสิ้นปี",                 name_en: "New Year's Eve" },
  ],
  2569: [
    { date: "2026-01-01", name_th: "วันขึ้นปีใหม่",              name_en: "New Year's Day" },
    { date: "2026-03-03", name_th: "วันมาฆบูชา",                 name_en: "Makha Bucha Day" },
    { date: "2026-04-06", name_th: "วันจักรี",                   name_en: "Chakri Day" },
    { date: "2026-04-13", name_th: "วันสงกรานต์",                name_en: "Songkran Festival" },
    { date: "2026-04-14", name_th: "วันสงกรานต์",                name_en: "Songkran Festival" },
    { date: "2026-04-15", name_th: "วันสงกรานต์",                name_en: "Songkran Festival" },
    { date: "2026-05-01", name_th: "วันแรงงานแห่งชาติ",         name_en: "National Labour Day" },
    { date: "2026-05-05", name_th: "วันฉัตรมงคล",               name_en: "Coronation Day" },
    { date: "2026-05-31", name_th: "วันวิสาขบูชา",              name_en: "Visakha Bucha Day" },
    { date: "2026-06-03", name_th: "วันเฉลิมพระชนมพรรษา สมเด็จพระราชินี", name_en: "HM The Queen's Birthday" },
    { date: "2026-07-28", name_th: "วันเฉลิมพระชนมพรรษา รัชกาลที่ 10", name_en: "HM King's Birthday" },
    { date: "2026-07-30", name_th: "วันอาสาฬหบูชา",             name_en: "Asalha Bucha Day" },
    { date: "2026-07-31", name_th: "วันเข้าพรรษา",              name_en: "Buddhist Lent Day" },
    { date: "2026-08-12", name_th: "วันแม่แห่งชาติ",            name_en: "HM Queen Mother's Birthday / Mother's Day" },
    { date: "2026-10-13", name_th: "วันคล้ายวันสวรรคต รัชกาลที่ 9", name_en: "HM King Bhumibol Memorial Day" },
    { date: "2026-10-23", name_th: "วันปิยมหาราช",              name_en: "Chulalongkorn Day" },
    { date: "2026-12-05", name_th: "วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 / วันพ่อแห่งชาติ", name_en: "HM King Bhumibol Birthday / Father's Day" },
    { date: "2026-12-10", name_th: "วันรัฐธรรมนูญ",             name_en: "Constitution Day" },
    { date: "2026-12-31", name_th: "วันสิ้นปี",                 name_en: "New Year's Eve" },
  ],
};

const YEAR_OPTIONS = [2568, 2569];

interface SyncHolidayModalProps {
  open: boolean;
  onClose: () => void;
  existingHolidays: ThaiHoliday[];
}

export function SyncHolidayModal({ open, onClose, existingHolidays }: SyncHolidayModalProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(2568);
  const [importing, setImporting] = useState(false);

  const previewList = MOCK_THAI_HOLIDAYS[selectedYear] ?? [];
  const existingDates = new Set(existingHolidays.map((h) => h.date));
  const duplicates = previewList.filter((h) => existingDates.has(h.date));
  const newItems = previewList.filter((h) => !existingDates.has(h.date));

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
          {/* Dev note: ใช้ mock data — ยังไม่ได้ integrate Google Calendar API */}
          <div className="flex gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              ขณะนี้ใช้ข้อมูลตัวอย่าง (mock data) — ยังไม่ได้เชื่อมต่อ Google Calendar API จริง
              กรุณาเพิ่ม <strong>GOOGLE_API_KEY</strong> ใน <code className="bg-orange-100 px-1 rounded">.env.local</code> ก่อน deploy จริง
            </span>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">เลือกปี:</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">พบ {previewList.length} รายการ</span>
          </div>

          {/* Preview list */}
          <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
            {previewList.map((h) => {
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

          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                พบ {duplicates.length} รายการที่มีในระบบแล้ว — จะข้ามรายการซ้ำ และนำเข้าเฉพาะ {newItems.length} รายการใหม่
              </span>
            </div>
          )}

          {newItems.length === 0 && (
            <div className="flex gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>วันหยุดปี {selectedYear} มีในระบบครบแล้ว</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
            <Button
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleImport}
              disabled={importing || newItems.length === 0}
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
