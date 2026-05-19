"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Trash2, CalendarDays, Search, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { HolidayModal } from "./HolidayModal";
import { SyncHolidayModal } from "./SyncHolidayModal";
import { ThaiHoliday } from "@/types";

const PAGE_SIZE = 15;

const TYPE_LABEL: Record<ThaiHoliday["type"], string> = {
  public_holiday:       "นักขัตฤกษ์",
  special_holiday:      "พิเศษ (ครม.)",
  government_holiday:   "ราชการ",
  substitution_holiday: "ชดเชย",
};
const TYPE_COLOR: Record<ThaiHoliday["type"], string> = {
  public_holiday:       "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  special_holiday:      "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  government_holiday:   "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  substitution_holiday: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

function formatThaiDateFromStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y + 543}`;
}

interface HolidayTableProps {
  holidays: ThaiHoliday[];
}

export function HolidayTable({ holidays: initial }: HolidayTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [confirmHoliday, setConfirmHoliday] = useState<ThaiHoliday | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = initial.filter(
    (h) =>
      h.name_th.includes(search) ||
      h.name_en.toLowerCase().includes(search.toLowerCase()) ||
      h.date.includes(search)
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  async function handleDeleteConfirmed() {
    if (!confirmHoliday) return;
    const { id, name_th } = confirmHoliday;
    setConfirmHoliday(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`ลบ "${name_th}" เรียบร้อยแล้ว`);
        router.refresh();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาวันหยุด..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              aria-label="ล้างการค้นหา"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            เพิ่มวันหยุด
          </Button>
          <Button
            variant="outline"
            onClick={() => setSyncOpen(true)}
            className="gap-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
          >
            <RefreshCw className="h-4 w-4" />
            Sync
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pl-6">วันที่ (พ.ศ.)</TableHead>
              <TableHead>ชื่อวันหยุด</TableHead>
              <TableHead>English</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>ชดเชย</TableHead>
              <TableHead className="text-right pr-6">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? (
                    <>
                      <p>ไม่พบวันหยุดที่ตรงกับ &ldquo;{search}&rdquo;</p>
                      <button type="button" onClick={() => handleSearch("")} className="text-xs text-primary underline mt-1">
                        ล้างการค้นหา
                      </button>
                    </>
                  ) : (
                    <p>ยังไม่มีวันหยุดในระบบ</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((h) => (
                <TableRow key={h.id} className="hover:bg-muted/50">
                  <TableCell className="pl-6 font-mono text-sm">
                    {formatThaiDateFromStr(h.date)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{h.name_th}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{h.name_en}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${TYPE_COLOR[h.type]}`}>
                      {TYPE_LABEL[h.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {h.is_substitution ? (
                      <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">ใช่</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmHoliday(h)}
                      disabled={deletingId === h.id}
                      className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          แสดง {filtered.length} จาก {initial.length} รายการ
        </p>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <HolidayModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SyncHolidayModal open={syncOpen} onClose={() => setSyncOpen(false)} existingHolidays={initial} />

      {/* Confirm Delete */}
      <Dialog open={!!confirmHoliday} onOpenChange={(v) => !v && setConfirmHoliday(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ต้องการลบ{" "}
            <span className="font-semibold text-foreground">&ldquo;{confirmHoliday?.name_th}&rdquo;</span>{" "}
            ({confirmHoliday?.date}) ออกจากระบบ?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmHoliday(null)}>ยกเลิก</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirmed}>ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
