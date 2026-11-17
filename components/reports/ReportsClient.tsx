"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bangkokDateString, cn, formatThaiDate } from "@/lib/utils";

type Tab = "payments" | "late" | "performance";
const TABS: { key: Tab; label: string }[] = [
  { key: "payments", label: "เงินรับชำระแทน" },
  { key: "late", label: "ล่าช้า / เบี้ยปรับ" },
  { key: "performance", label: "ผลงานรายพนักงาน" },
];
const baht = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const d = (s: string) => (s ? formatThaiDate(s) : "—");

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ReportsClient() {
  const today = bangkokDateString();
  const [tab, setTab] = useState<Tab>("payments");
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const query = `type=${tab}&from=${from}&to=${to}`;

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    setData(null);
    fetch(`/api/reports?${query}`)
      .then((r) => r.json())
      .then((j) => setData(j.data ?? null))
      .finally(() => setLoading(false));
  }, [query, from, to]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">รายงาน</h2>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex rounded-md border overflow-hidden text-sm">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("px-3 py-1.5", tab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{tab === "payments" ? "ยื่นแบบตั้งแต่" : "ครบกำหนดตั้งแต่"}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ถึง</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 ml-auto">
          <a href={`/api/reports?${query}&format=xlsx`}>
            <Download className="h-4 w-4" />
            ส่งออก Excel
          </a>
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}

      {!loading && data && tab === "payments" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ["รอรับจากลูกค้า", data.summary.awaitingClient],
              ["รับแล้วแต่ยังไม่ชำระ", data.summary.receivedNotPaid],
              ["ชำระแล้ว", data.summary.paid],
            ].map(([label, value]) => (
              <Card key={label as string}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{baht(value as number)}</p>
              </CardContent></Card>
            ))}
          </div>
          <ReportTable
            head={["บริษัท", "ประเภทภาษี", "ยอดภาษี", "ครบกำหนด", "ยื่น", "รับเงินลูกค้า", "ชำระ", "สถานะ"]}
            rows={data.rows.map((r: any) => [r.company, r.taxType, baht(r.amount), d(r.dueDate), d(r.filedAt), d(r.clientPaidAt), d(r.officePaidAt), r.status])}
          />
        </>
      )}

      {!loading && data && tab === "late" && (
        <>
          <ReportTable
            title="สรุปตามบริษัท"
            head={["บริษัท", "งานล่าช้า", "เบี้ยปรับ", "เงินเพิ่ม", "สำนักงานรับภาระ"]}
            rows={data.byCompany.map((c: any) => [c.company, c.count, baht(c.penalty), baht(c.surcharge), baht(c.officeBorne)])}
          />
          <ReportTable
            title="รายการ"
            head={["บริษัท", "ประเภทภาษี", "ครบกำหนด", "ยื่น", "ชำระ", "ล่าช้า", "เบี้ยปรับ", "เงินเพิ่ม", "ผู้รับภาระ", "สาเหตุ"]}
            rows={data.rows.map((r: any) => [r.company, r.taxType, d(r.dueDate), d(r.filedAt), d(r.officePaidAt), r.kind, baht(r.penalty), baht(r.surcharge), r.borneBy || "—", r.reason || "—"])}
          />
        </>
      )}

      {!loading && data && tab === "performance" && (
        <ReportTable
          head={["พนักงาน", "งานทั้งหมด", "เสร็จสิ้น", "ทันกำหนด", "ล่าช้า", "% ทันกำหนด", "ค้างอยู่ตอนนี้", "เกินกำหนดตอนนี้"]}
          rows={data.map((p: any) => [p.name, p.total, p.done, p.onTime, p.late, `${p.onTimePct}%`, p.openNow, p.overdueNow])}
        />
      )}
    </div>
  );
}

function ReportTable({ title, head, rows }: { title?: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-semibold">{title}</p>}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">{head.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={head.length} className="text-center text-sm text-muted-foreground py-8">ไม่มีข้อมูลในช่วงนี้</TableCell></TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className="text-sm">{c}</TableCell>)}</TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
