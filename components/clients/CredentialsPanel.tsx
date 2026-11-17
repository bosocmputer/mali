"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/types";

type GovSystem = "RD" | "DBD" | "SSO";
const SYSTEMS: GovSystem[] = ["RD", "DBD", "SSO"];
const SYSTEM_LABEL: Record<GovSystem, string> = {
  RD: "กรมสรรพากร (RD)",
  DBD: "กรมพัฒนาธุรกิจการค้า (DBD)",
  SSO: "ประกันสังคม (SSO)",
};
const HIDE_AFTER_MS = 30_000; // FR-72

type Credential = { id: string; system: GovSystem; username: string; note?: string; updatedAt: string; updatedByName?: string };
type Draft = { id?: string; system: GovSystem; username: string; password: string; note: string };

/**
 * รหัสเข้าเว็บหน่วยงานรัฐ of one company (FR-71–74). Passwords are never in the list; "แสดง" asks
 * the server for one password (logged) and hides it again after 30 seconds, "คัดลอก" copies it
 * without showing it (also logged). Branches of the same tax id share one set (answer 8).
 */
export function CredentialsPanel({ client }: { client: Client }) {
  const [items, setItems] = useState<Credential[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<Record<string, number>>({});
  const base = `/api/clients/${client.id}/credentials`;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(base);
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(json.data ?? []);
      setCanEdit(!!json.canEdit);
      setError(null);
    } else setError(json.error ?? "โหลดไม่สำเร็จ");
    setLoading(false);
  }, [base]);

  useEffect(() => {
    load();
    const t = timers.current;
    return () => Object.values(t).forEach((id) => window.clearTimeout(id));
  }, [load]);

  async function reveal(id: string, action: "VIEW" | "COPY"): Promise<string | null> {
    const res = await fetch(`${base}/${id}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "ไม่สามารถดูรหัสได้");
      return null;
    }
    return json.data.password as string;
  }

  const hide = (id: string) =>
    setShown((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });

  async function toggleShow(id: string) {
    if (shown[id]) {
      hide(id);
      return;
    }
    const password = await reveal(id, "VIEW");
    if (password === null) return;
    setShown((s) => ({ ...s, [id]: password }));
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => hide(id), HIDE_AFTER_MS);
  }

  async function copyPassword(id: string) {
    const password = await reveal(id, "COPY");
    if (password === null) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("คัดลอกรหัสผ่านแล้ว");
    } catch {
      toast.error("คัดลอกไม่ได้ในเบราว์เซอร์นี้ — กด “แสดง” แทน");
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("คัดลอกชื่อผู้ใช้แล้ว");
    } catch {
      toast.error("คัดลอกไม่ได้ในเบราว์เซอร์นี้");
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const res = await fetch(draft.id ? `${base}/${draft.id}` : base, {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(draft.id ? {} : { system: draft.system }),
          username: draft.username,
          ...(draft.password ? { password: draft.password } : {}),
          note: draft.note || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      setItems(json.data ?? []);
      setDraft(null);
      toast.success("บันทึกแล้ว");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Credential) {
    if (!window.confirm(`ลบบัญชี ${item.username} (${SYSTEM_LABEL[item.system]})?`)) return;
    const res = await fetch(`${base}/${item.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(json.data ?? []);
      toast.success("ลบแล้ว");
    } else toast.error(json.error ?? "ลบไม่สำเร็จ");
  }

  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="space-y-4">
      {client.taxId && (
        <p className="text-xs text-muted-foreground">
          ใช้ร่วมกันทุกสาขาของเลขนิติบุคคล <span className="font-mono">{client.taxId}</span> · ทุกการดูและคัดลอกรหัสถูกบันทึก
        </p>
      )}

      {SYSTEMS.map((system) => {
        const list = items.filter((i) => i.system === system);
        return (
          <div key={system} className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-semibold">{SYSTEM_LABEL[system]}</p>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 gap-1 text-xs"
                  onClick={() => setDraft({ system, username: "", password: "", note: "" })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  เพิ่มบัญชี
                </Button>
              )}
            </div>
            {list.length === 0 && <p className="text-xs text-muted-foreground pl-5">ยังไม่มีข้อมูล</p>}
            {list.map((item) => (
              <div key={item.id} className="rounded-md border p-2.5 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">ผู้ใช้</span>
                  <span className="font-mono break-all">{item.username}</span>
                  <button type="button" title="คัดลอกชื่อผู้ใช้" onClick={() => copyText(item.username)} className="ml-auto p-1 text-muted-foreground hover:text-foreground">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">รหัสผ่าน</span>
                  <span className="font-mono break-all">{shown[item.id] ?? "••••••••"}</span>
                  <span className="ml-auto flex items-center">
                    <button type="button" title={shown[item.id] ? "ซ่อน" : "แสดง (ซ่อนเองใน 30 วินาที)"} onClick={() => toggleShow(item.id)} className="p-1 text-muted-foreground hover:text-foreground">
                      {shown[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" title="คัดลอกรหัสผ่าน (ไม่แสดงบนจอ)" onClick={() => copyPassword(item.id)} className="p-1 text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                {item.note && (
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground w-16">หมายเหตุ</span>
                    <span className="text-xs whitespace-pre-wrap">{item.note}</span>
                  </div>
                )}
                <div className="flex items-center text-[11px] text-muted-foreground">
                  แก้ไขล่าสุด {new Date(item.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}
                  {item.updatedByName && ` โดย ${item.updatedByName}`}
                  {canEdit && (
                    <span className="ml-auto flex">
                      <button type="button" title="แก้ไข" onClick={() => setDraft({ id: item.id, system, username: item.username, password: "", note: item.note ?? "" })} className="p-1 hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" title="ลบ" onClick={() => remove(item)} className="p-1 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {draft && draft.system === system && (
              <div className="rounded-md border border-primary/40 p-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">ชื่อผู้ใช้</Label>
                  <Input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} autoComplete="off" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{draft.id ? "รหัสผ่านใหม่ (เว้นว่าง = ใช้รหัสเดิม)" : "รหัสผ่าน"}</Label>
                  <Input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} autoComplete="new-password" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">หมายเหตุ (เช่น เบอร์ที่รับ OTP)</Label>
                  <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(null)}>ยกเลิก</Button>
                  <Button size="sm" disabled={busy || !draft.username.trim() || (!draft.id && !draft.password)} onClick={save}>บันทึก</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          ดูและคัดลอกได้ · เพิ่มหรือแก้รหัสได้เฉพาะผู้จัดการ ผู้รับผิดชอบบริษัท และหัวหน้าทีม
        </p>
      )}
    </div>
  );
}
