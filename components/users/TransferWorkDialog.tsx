"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@/types";

type Row = { id: string; label: string; openTasks: number; isActive: boolean };

/**
 * FR-104: move a person's companies and unfinished tasks to someone else — all at once or only
 * the ones ticked. Finished tasks stay with the person who did them.
 */
export function TransferWorkDialog({ from, users, onClose }: { from: User | null; users: User[]; onClose: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!from) return;
    setRows(null);
    setTo("");
    fetch(`/api/transfers?from=${from.id}`)
      .then((r) => r.json())
      .then((j) => {
        const list: Row[] = j.data ?? [];
        setRows(list);
        setSelected(new Set(list.map((r) => r.id)));
      });
  }, [from]);

  const chosen = rows?.filter((r) => selected.has(r.id)) ?? [];
  const taskCount = chosen.reduce((s, r) => s + r.openTasks, 0);

  async function submit() {
    if (!from || !to) return;
    setBusy(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: from.id, toUserId: to, clientIds: chosen.map((r) => r.id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "โอนไม่สำเร็จ");
      toast.success(`โอนแล้ว ${json.data.clients} บริษัท, ${json.data.tasks} งาน`);
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!from} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>โอนงานของ {from?.name}</DialogTitle>
        </DialogHeader>
        {!rows ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีบริษัทที่รับผิดชอบอยู่</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label className="text-xs">โอนให้</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue placeholder="เลือกพนักงาน" /></SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.isActive && u.id !== from?.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">บริษัท ({chosen.length}/{rows.length})</Label>
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)))}
              >
                {selected.size === rows.length ? "ไม่เลือกเลย" : "เลือกทั้งหมด"}
              </button>
            </div>
            <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
              {rows.map((r) => (
                <label key={r.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() =>
                      setSelected((s) => {
                        const next = new Set(s);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        return next;
                      })
                    }
                  />
                  <span className={r.isActive ? "" : "text-muted-foreground line-through"}>{r.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{r.openTasks} งานค้าง</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              จะโอน {chosen.length} บริษัท และงานที่ยังไม่เสร็จ {taskCount} งาน · งานที่เสร็จแล้วยังเป็นของคนเดิม · ผู้รับโอนจะได้รับแจ้งทาง LINE
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={onClose}>ยกเลิก</Button>
              <Button size="sm" disabled={busy || !to || chosen.length === 0} onClick={submit}>โอนงาน</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
