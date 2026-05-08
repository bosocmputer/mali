"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Trash2, BookOpen, Search, X, Pencil, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Rule } from "@/types";
import { RuleModal } from "./RuleModal";

const CALC_METHOD_LABEL: Record<string, string> = {
  fixed_day: "วันที่คงที่",
  offset_days: "+ วัน",
  offset_months: "+ เดือน",
};

const REF_DATE_LABEL: Record<string, string> = {
  month_end: "สิ้นเดือน",
  fiscal_year_end: "สิ้นรอบบัญชี",
  agm_date: "วันประชุมผู้ถือหุ้น",
};

interface RuleTableProps {
  rules: Rule[];
}

export function RuleTable({ rules: initial }: RuleTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [confirmRule, setConfirmRule] = useState<Rule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = initial.filter(
    (r) =>
      r.name.includes(search) ||
      (r.taxForm ?? "").includes(search) ||
      r.ruleCode.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDeleteConfirmed() {
    if (!confirmRule) return;
    const { id, name } = confirmRule;
    setConfirmRule(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`ลบกฎ "${name}" เรียบร้อยแล้ว`);
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

  function calcSummary(rule: Rule): string {
    if (rule.calcMethod === "fixed_day") return `วันที่ ${rule.fixedDay} ของเดือนถัดไป`;
    if (rule.calcMethod === "offset_days") return `+${rule.offset} วัน`;
    if (rule.calcMethod === "offset_months") return `+${rule.offset} เดือน`;
    return "-";
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหากฎ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              aria-label="ล้างการค้นหา"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          เพิ่มกฎใหม่
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="pl-6">รหัสกฎ</TableHead>
              <TableHead>ชื่อกฎ</TableHead>
              <TableHead>แบบฟอร์ม</TableHead>
              <TableHead>วิธีคำนวณ</TableHead>
              <TableHead>อ้างอิง</TableHead>
              <TableHead>กฎหมาย</TableHead>
              <TableHead className="text-right pr-6">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? (
                    <>
                      <p>ไม่พบกฎที่ตรงกับ &ldquo;{search}&rdquo;</p>
                      <button type="button" onClick={() => setSearch("")} className="text-xs text-primary underline mt-1">
                        ล้างการค้นหา
                      </button>
                    </>
                  ) : (
                    <p>ยังไม่มีกฎในระบบ</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50/50">
                  <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{r.ruleCode}</TableCell>
                  <TableCell className="text-sm font-medium">
                    <div>{r.name}</div>
                    {r.updatedAt && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-600">
                          แก้ไขล่าสุด {new Date(r.updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.taxForm ? (
                      <Badge variant="outline" className="text-xs font-mono">{r.taxForm}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{calcSummary(r)}</div>
                    <div className="text-xs text-muted-foreground">{CALC_METHOD_LABEL[r.calcMethod]}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-slate-50">
                      {REF_DATE_LABEL[r.referenceDate] ?? r.referenceDate}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{r.legalRef}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditRule(r)}
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmRule(r)}
                        disabled={deletingId === r.id}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        แสดง {filtered.length} จาก {initial.length} กฎ
      </p>

      <RuleModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RuleModal open={!!editRule} rule={editRule} onClose={() => setEditRule(null)} />

      {/* Confirm Delete */}
      <Dialog open={!!confirmRule} onOpenChange={(v) => !v && setConfirmRule(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบกฎ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ต้องการลบกฎ{" "}
            <span className="font-semibold text-foreground">&ldquo;{confirmRule?.name}&rdquo;</span>{" "}
            ({confirmRule?.ruleCode}) ออกจากระบบ?
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            งานที่สร้างไปแล้วจะไม่ถูกกระทบ แต่การสร้างงานใหม่ด้วยกฎนี้จะไม่ได้ผลลัพธ์
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmRule(null)}>ยกเลิก</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirmed}>ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
