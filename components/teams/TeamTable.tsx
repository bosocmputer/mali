"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Trash2, Users, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Team, User } from "@/types";
import { TeamModal } from "./TeamModal";

interface TeamTableProps {
  teams: Team[];
  users: User[];
}

export function TeamTable({ teams: initial, users }: TeamTableProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [confirmTeam, setConfirmTeam] = useState<Team | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  function userName(id: string) {
    return users.find((u) => u.id === id)?.name ?? id;
  }

  async function handleNotifyTeam(team: Team) {
    setNotifyingId(team.id);
    try {
      const res = await fetch("/api/teams/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "ส่งข้อความไม่สำเร็จ");
      } else {
        toast.success(`ส่งสรุปงานทีม "${team.name}" ไปที่ LINE ของ ${json.sentTo} แล้ว`);
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setNotifyingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirmTeam) return;
    const { id, name } = confirmTeam;
    setConfirmTeam(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/teams?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`ลบทีม "${name}" เรียบร้อยแล้ว`);
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
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          สร้างทีมใหม่
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pl-6">ชื่อทีม</TableHead>
              <TableHead>หัวหน้าทีม</TableHead>
              <TableHead>สมาชิก</TableHead>
              <TableHead className="text-right pr-6">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>ยังไม่มีทีมในระบบ</p>
                </TableCell>
              </TableRow>
            ) : (
              initial.map((team) => (
                <TableRow key={team.id} className="hover:bg-muted/50">
                  <TableCell className="pl-6 font-medium text-sm">{team.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                      {userName(team.leadUserId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {team.memberIds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        team.memberIds.map((mid) => (
                          <Badge key={mid} variant="outline" className="text-xs">
                            {userName(mid)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleNotifyTeam(team)}
                        disabled={notifyingId === team.id}
                        title="ส่งสรุปงานประจำเดือนไปที่ LINE หัวหน้าทีม"
                        className="h-8 px-2.5 gap-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        <Send className={`h-3.5 w-3.5 ${notifyingId === team.id ? "animate-pulse" : ""}`} />
                        {notifyingId === team.id ? "กำลังส่ง..." : "ส่งสรุป LINE"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditTeam(team)}
                        className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmTeam(team)}
                        disabled={deletingId === team.id}
                        className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400"
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

      <TeamModal open={addOpen} users={users} onClose={() => setAddOpen(false)} />
      <TeamModal open={!!editTeam} team={editTeam} users={users} onClose={() => setEditTeam(null)} />

      <Dialog open={!!confirmTeam} onOpenChange={(v) => !v && setConfirmTeam(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบทีม</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ต้องการลบทีม{" "}
            <span className="font-semibold text-foreground">&ldquo;{confirmTeam?.name}&rdquo;</span>{" "}
            ออกจากระบบ?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmTeam(null)}>ยกเลิก</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirmed}>ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
