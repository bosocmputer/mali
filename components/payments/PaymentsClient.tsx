"use client";

import { clientLabel } from "@/lib/clientLabel";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileLinks, PaymentFilesInput } from "@/components/tasks/PaymentFilesInput";
import { bangkokDateString, cn, formatThaiDate, isOverdue, notifyTasksChanged } from "@/lib/utils";
import type { Task } from "@/types";

const baht = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * รายการรอชำระ (FR-80, FR-81, FR-87): tasks the client has paid the office for and the supervisor
 * now pays to the government. Pick one or many, set the payment date, attach receipts — one
 * shared file can cover several items (a single receipt for several forms), or each item its own.
 */
export function PaymentsClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [date, setDate] = useState(bangkokDateString());
  const [sharedFiles, setSharedFiles] = useState<string[]>([]);
  const [itemFiles, setItemFiles] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks?status=AWAITING_OFFICE_PAYMENT");
      const json = await res.json();
      const list: Task[] = (json.data ?? []).sort(
        (a: Task, b: Task) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      setTasks(list);
      setSelected((prev) => new Set(Array.from(prev).filter((id) => list.some((t) => t.id === id))));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => tasks.reduce((sum, t) => sum + (t.taxAmount ?? 0), 0), [tasks]);
  const chosen = tasks.filter((t) => selected.has(t.id));
  const chosenTotal = chosen.reduce((sum, t) => sum + (t.taxAmount ?? 0), 0);
  const filesFor = (id: string) => [...sharedFiles, ...(itemFiles[id] ?? [])];
  const missingReceipt = chosen.filter((t) => filesFor(t.id).length === 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openDialog() {
    setDate(bangkokDateString());
    setSharedFiles([]);
    setItemFiles({});
    setDialogOpen(true);
  }

  async function save() {
    if (missingReceipt.length > 0) {
      toast.error("ต้องแนบใบเสร็จครบทุกรายการ");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          items: chosen.map((t) => ({ taskId: t.id, receiptUrls: filesFor(t.id) })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && !json.data) {
        toast.error(json.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      const { done = [], failed = [] } = json.data ?? {};
      if (done.length) toast.success(`บันทึกการชำระ ${done.length} รายการ — งานเสร็จสิ้นแล้ว`);
      if (failed.length) toast.error(`บันทึกไม่ได้ ${failed.length} รายการ: ${failed[0].error}`);
      setDialogOpen(false);
      setSelected(new Set());
      notifyTasksChanged();
      await load();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setSaving(false);
    }
  }

  const allChecked = tasks.length > 0 && selected.size === tasks.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">รายการรอชำระ</h2>
          <span className="text-sm text-muted-foreground">ลูกค้าโอนให้สำนักงานแล้ว รอผู้จัดการชำระภาษี</span>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          รีเฟรช
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">รายการทั้งหมด</p>
          <p className="text-2xl font-bold">{tasks.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">ยอดรวม (บาท)</p>
          <p className="text-2xl font-bold">{baht(total)}</p>
        </CardContent></Card>
        <Card className="col-span-2 sm:col-span-1"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">เลือกแล้ว {chosen.length} รายการ</p>
          <p className="text-2xl font-bold">{baht(chosenTotal)}</p>
        </CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={chosen.length === 0} onClick={openDialog}>
          <Landmark className="h-4 w-4" />
          บันทึกการชำระ {chosen.length > 0 ? `(${chosen.length} รายการ)` : ""}
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="เลือกทั้งหมด"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(tasks.map((t) => t.id)))}
                />
              </TableHead>
              <TableHead>บริษัท</TableHead>
              <TableHead>ประเภทภาษี</TableHead>
              <TableHead className="text-right">ยอดภาษี (บาท)</TableHead>
              <TableHead>ครบกำหนด</TableHead>
              <TableHead className="hidden md:table-cell">ผู้รับผิดชอบ</TableHead>
              <TableHead className="hidden md:table-cell">ลูกค้าชำระ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  ไม่มีรายการรอชำระ
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => toggle(t.id)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`เลือก ${clientLabel(t.client)}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{clientLabel(t.client)}</TableCell>
                  <TableCell>{t.taxType.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.taxAmount !== undefined ? baht(t.taxAmount) : "—"}</TableCell>
                  <TableCell className={cn(isOverdue(t.dueDate, t.status) && "text-red-600 dark:text-red-400 font-medium")}>
                    {formatThaiDate(t.dueDate)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{t.assignedUser.name}</TableCell>
                  <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">{t.clientPaidAt ? formatThaiDate(t.clientPaidAt) : "—"}</span>
                    <FileLinks urls={t.clientSlipUrls} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && !saving && setDialogOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>บันทึกการชำระ {chosen.length} รายการ · {baht(chosenTotal)} บาท</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label className="text-xs">วันที่ชำระ</Label>
              <Input type="date" value={date} max={bangkokDateString()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ใบเสร็จที่ใช้กับทุกรายการ (ถ้ามีใบเดียวรวมกัน)</Label>
              <PaymentFilesInput value={sharedFiles} onChange={setSharedFiles} label="แนบใบเสร็จรวม" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">หรือแนบแยกรายการ</Label>
              {chosen.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-md border p-2 space-y-1",
                    filesFor(t.id).length === 0 && "border-amber-300 dark:border-amber-700"
                  )}
                >
                  <p className="text-xs font-medium">
                    {t.taxType.name} · {clientLabel(t.client)}
                    <span className="text-muted-foreground font-normal"> · {t.taxAmount !== undefined ? `${baht(t.taxAmount)} บาท` : ""}</span>
                  </p>
                  <PaymentFilesInput
                    compact
                    value={itemFiles[t.id] ?? []}
                    onChange={(urls) => setItemFiles((prev) => ({ ...prev, [t.id]: urls }))}
                    label="แนบใบเสร็จ"
                  />
                </div>
              ))}
            </div>
            {missingReceipt.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">ยังไม่มีใบเสร็จ {missingReceipt.length} รายการ</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving || missingReceipt.length > 0} onClick={save}>
              {saving ? "กำลังบันทึก..." : "บันทึกการชำระ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
