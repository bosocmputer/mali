"use client";

import { useEffect, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Entry = { id: string; at: string; userName: string; action: string; system: string; companyLabel: string; username: string };

const ACTION_LABEL: Record<string, string> = {
  VIEW: "แสดงรหัส",
  COPY: "คัดลอกรหัส",
  CREATE: "เพิ่มบัญชี",
  UPDATE: "แก้ไข",
  DELETE: "ลบบัญชี",
};

export function CredentialLogTable() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/credential-logs${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`)
        .then((r) => r.json())
        .then((j) => setRows(j.data ?? []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">ประวัติการเข้าถึงรหัสหน่วยงานรัฐ</h2>
      </div>
      <p className="text-sm text-muted-foreground">บันทึกนี้แก้ไขหรือลบไม่ได้ แสดงล่าสุด 300 รายการ (ค้นหาเพื่อดูรายการเก่ากว่า)</p>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ค้นหาบริษัท ผู้ใช้ หรือชื่อบัญชี..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>เวลา</TableHead>
              <TableHead>ผู้ใช้งาน</TableHead>
              <TableHead>การกระทำ</TableHead>
              <TableHead>ระบบ</TableHead>
              <TableHead>บริษัท</TableHead>
              <TableHead>บัญชี</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">ยังไม่มีประวัติ</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(r.at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "medium" })}
                  </TableCell>
                  <TableCell className="text-sm">{r.userName}</TableCell>
                  <TableCell className="text-sm">{ACTION_LABEL[r.action] ?? r.action}</TableCell>
                  <TableCell className="text-sm">{r.system}</TableCell>
                  <TableCell className="text-sm">{r.companyLabel}</TableCell>
                  <TableCell className="text-sm font-mono">{r.username}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
