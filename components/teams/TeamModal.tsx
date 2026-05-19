"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Team, User } from "@/types";

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team | null;
  users: User[];
}

const DEFAULT = { name: "", leadUserId: "", memberIds: [] as string[] };

export function TeamModal({ open, onClose, team, users }: TeamModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (team) {
      setForm({ name: team.name, leadUserId: team.leadUserId, memberIds: [...team.memberIds] });
    } else {
      setForm(DEFAULT);
    }
    setError(null);
  }, [team, open]);

  function toggleMember(userId: string) {
    setForm((p) => ({
      ...p,
      memberIds: p.memberIds.includes(userId)
        ? p.memberIds.filter((id) => id !== userId)
        : [...p.memberIds, userId],
    }));
  }

  function handleClose() {
    setForm(DEFAULT);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.leadUserId) {
      setError("กรุณากรอกชื่อทีมและเลือกหัวหน้าทีม");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams", {
        method: team ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(team ? { id: team.id } : {}), ...form, name: form.name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success(team ? "แก้ไขทีมเรียบร้อยแล้ว" : "สร้างทีมใหม่เรียบร้อยแล้ว");
        router.refresh();
        handleClose();
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoading(false);
    }
  }

  const staffUsers = users.filter((u) => u.role === "STAFF" || u.role === "SUPERVISOR");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            {team ? "แก้ไขทีม" : "สร้างทีมใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>ชื่อทีม *</Label>
            <Input
              placeholder="ทีมบัญชี A"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>หัวหน้าทีม *</Label>
            <Select value={form.leadUserId} onValueChange={(v) => setForm((p) => ({ ...p, leadUserId: v }))}>
              <SelectTrigger><SelectValue placeholder="เลือกหัวหน้าทีม..." /></SelectTrigger>
              <SelectContent>
                {staffUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>สมาชิกทีม</Label>
            <div className="flex flex-col gap-1.5">
              {staffUsers.map((u) => {
                const selected = form.memberIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                      selected
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "bg-white dark:bg-slate-900 border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {selected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {u.name}
                    <Badge variant="outline" className="ml-auto text-xs py-0 h-4">
                      {u.role === "SUPERVISOR" ? "ผู้จัดการ" : "เจ้าหน้าที่"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>ยกเลิก</Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {loading ? "กำลังบันทึก..." : team ? "บันทึก" : "สร้างทีม"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
