"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, CheckCircle2, Clock, Phone, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface WebInquiry {
  id: string;
  name: string;
  contact: string;
  subject: string;
  message: string;
  lang: string;
  status: "NEW" | "CONTACTED";
  staffNote: string | null;
  contactedAt: string | null;
  createdAt: string;
  contactedBy: { id: string; name: string } | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InquiriesPage() {
  const [items, setItems] = useState<WebInquiry[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "NEW" | "CONTACTED">("ALL");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/inquiries${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const json = await res.json();
      setItems(json.data ?? []);
      setNewCount(json.newCount ?? 0);
    } catch {
      toast.error("ไม่สามารถโหลดรายการข้อความได้");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(item: WebInquiry, status: "NEW" | "CONTACTED") {
    setBusyId(item.id);
    try {
      const staffNote = notes[item.id] ?? item.staffNote ?? "";
      const res = await fetch(`/api/inquiries/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, staffNote: staffNote || null }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        status === "CONTACTED"
          ? "บันทึกการติดต่อกลับเรียบร้อยแล้ว"
          : "เปลี่ยนสถานะเป็นรอติดต่อกลับแล้ว"
      );
      await load();
    } catch {
      toast.error("บันทึกสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ยืนยันการลบข้อความนี้?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("ลบรายการแล้ว");
      await load();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            ข้อความติดต่อจากเว็บ (hash-tax.com)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            รายการข้อความที่ลูกค้าส่งมาจากหน้าเว็บไซต์ พร้อมบันทึกผู้ติดต่อกลับ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={newCount > 0 ? "destructive" : "secondary"} className="text-sm px-3 py-1">
            รอติดต่อกลับ {newCount} รายการ
          </Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "ALL", label: "ทั้งหมด" },
            { key: "NEW", label: "รอติดต่อกลับ" },
            { key: "CONTACTED", label: "ติดต่อกลับแล้ว" },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={filter === tab.key ? "default" : "outline"}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ยังไม่มีข้อความในหมวดนี้
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isNew = item.status === "NEW";
            return (
              <Card
                key={item.id}
                className={isNew ? "border-amber-400/70 bg-amber-50/30 dark:bg-amber-950/10" : ""}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex flex-wrap items-center gap-2">
                        <span>{item.subject}</span>
                        <Badge variant={isNew ? "destructive" : "secondary"}>
                          {isNew ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> รอติดต่อกลับ
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> ติดต่อกลับแล้ว
                            </span>
                          )}
                        </Badge>
                        <Badge variant="outline" className="uppercase text-xs">
                          {item.lang}
                        </Badge>
                      </CardTitle>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span>ผู้ติดต่อ: <strong className="text-foreground">{item.name}</strong></span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <strong className="text-foreground">{item.contact}</strong>
                        </span>
                        <span>ส่งเมื่อ: {formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                      title="ลบข้อความ"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap bg-background/80 p-3 rounded-md border">
                    {item.message}
                  </p>

                  {item.status === "CONTACTED" && item.contactedBy && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-md border border-emerald-200 dark:border-emerald-900">
                      ติดต่อกลับแล้วโดย <strong>{item.contactedBy.name}</strong> เมื่อ{" "}
                      {formatDate(item.contactedAt)}
                      {item.staffNote ? ` — หมายเหตุ: ${item.staffNote}` : ""}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Input
                      className="flex-1 min-w-[220px]"
                      placeholder="หมายเหตุการติดต่อกลับ (ถ้ามี)..."
                      value={notes[item.id] ?? item.staffNote ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                    />
                    {isNew ? (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(item, "CONTACTED")}
                        disabled={busyId === item.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        บันทึกว่าติดต่อกลับแล้ว
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(item, "NEW")}
                        disabled={busyId === item.id}
                      >
                        เปลี่ยนเป็นรอติดต่อ
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
