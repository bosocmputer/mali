"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  Copy,
  KeyRound,
  Pencil,
  PlusCircle,
  Power,
  Shield,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatThaiDate } from "@/lib/utils";
import type { Role, User } from "@/types";
import { UserModal } from "./UserModal";

interface UserTableProps {
  users: User[];
  currentUserId: string;
}

type TemporaryPasswordState = {
  title: string;
  name: string;
  email: string;
  password: string;
};

async function parseApiError(res: Response): Promise<string> {
  const json = await res.json().catch(() => null);
  return json?.error ?? "เกิดข้อผิดพลาด";
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [action, setAction] = useState<"reset" | "status" | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [temporary, setTemporary] = useState<TemporaryPasswordState | null>(
    null
  );

  async function submitUser(payload: {
    id?: string;
    name: string;
    email?: string;
    role: Role;
    password?: string;
  }) {
    const res = await fetch("/api/users", {
      method: payload.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await parseApiError(res));
    }

    const json = await res.json();
    const data = json.data as { user: User; temporaryPassword?: string };
    const user = data.user;

    toast.success(payload.id ? "แก้ไขผู้ใช้เรียบร้อยแล้ว" : "เพิ่มผู้ใช้เรียบร้อยแล้ว");
    if (data.temporaryPassword) {
      setTemporary({
        title: "รหัสผ่านเริ่มต้น",
        name: user.name,
        email: user.email,
        password: data.temporaryPassword,
      });
    }
    router.refresh();
  }

  async function patchUser(
    user: User,
    payload: { isActive?: boolean; resetPassword?: boolean }
  ) {
    setLoadingId(user.id);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, ...payload }),
      });
      if (!res.ok) {
        toast.error(await parseApiError(res));
        return;
      }

      const json = await res.json();
      if (json.data?.temporaryPassword) {
        setTemporary({
          title: "รหัสผ่านใหม่",
          name: user.name,
          email: user.email,
          password: json.data.temporaryPassword,
        });
      }
      toast.success(payload.resetPassword ? "รีเซ็ตรหัสผ่านแล้ว" : "อัปเดตสถานะแล้ว");
      router.refresh();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setLoadingId(null);
      setPendingUser(null);
      setAction(null);
    }
  }

  async function copyPassword() {
    if (!temporary) return;
    try {
      await navigator.clipboard.writeText(temporary.password);
      toast.success("คัดลอกรหัสผ่านแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  }

  async function handleNotifyUser(user: User) {
    setNotifyingId(user.id);
    try {
      const res = await fetch("/api/users/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "ส่งแจ้งเตือนไม่สำเร็จ");
      } else if (!json.ok) {
        toast.info(json.reason ?? "ไม่มีงานค้างของผู้ใช้นี้");
      } else {
        const overdueNote = json.overdueCount > 0 ? ` (เกินกำหนด ${json.overdueCount} งาน)` : "";
        toast.success(`ส่งแจ้งเตือน ${json.taskCount} งาน ไปที่ LINE ของ ${json.sentTo} แล้ว${overdueNote}`);
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setNotifyingId(null);
    }
  }

  const activeCount = users.filter((user) => user.isActive).length;
  const supervisorCount = users.filter(
    (user) => user.role === "SUPERVISOR" && user.isActive
  ).length;

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Badge variant="outline" className="h-8 justify-center gap-1.5 px-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ใช้งาน {activeCount}
          </Badge>
          <Badge variant="outline" className="h-8 justify-center gap-1.5 px-3">
            <Shield className="h-3.5 w-3.5 text-primary" />
            ผู้จัดการ {supervisorCount}
          </Badge>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          เพิ่มผู้ใช้
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pl-6">ผู้ใช้</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>LINE</TableHead>
              <TableHead>สร้างเมื่อ</TableHead>
              <TableHead className="text-right pr-6">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p>ยังไม่มีผู้ใช้ในระบบ</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell className="pl-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (คุณ)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.role === "SUPERVISOR"
                          ? "border-primary/20 bg-primary/5 text-primary"
                          : "bg-secondary/60 text-muted-foreground"
                      }
                    >
                      {user.role === "SUPERVISOR" ? "ผู้จัดการ" : "เจ้าหน้าที่"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }
                    >
                      {user.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {user.lineUserId ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatThaiDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* ปุ่มแจ้งเตือน LINE — แสดงเฉพาะ user ที่ active และมี LINE */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleNotifyUser(user)}
                              disabled={
                                notifyingId === user.id ||
                                !user.isActive ||
                                !user.lineUserId
                              }
                              className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 disabled:opacity-30"
                              aria-label="ส่งแจ้งเตือน LINE"
                            >
                              <Bell className={`h-3.5 w-3.5 ${notifyingId === user.id ? "animate-pulse" : ""}`} />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {!user.isActive
                            ? "ผู้ใช้ถูกปิดใช้งาน"
                            : !user.lineUserId
                              ? "ยังไม่ได้เชื่อมต่อ LINE"
                              : notifyingId === user.id
                                ? "กำลังส่ง..."
                                : "ส่งแจ้งเตือนงานไป LINE"}
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditUser(user)}
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
                        aria-label="แก้ไขผู้ใช้"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPendingUser(user);
                          setAction("reset");
                        }}
                        disabled={loadingId === user.id || !user.isActive}
                        className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/50 dark:hover:text-amber-400"
                        aria-label="รีเซ็ตรหัสผ่าน"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPendingUser(user);
                          setAction("status");
                        }}
                        disabled={loadingId === user.id || user.id === currentUserId}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        aria-label={user.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserModal
        open={addOpen}
        currentUserId={currentUserId}
        onClose={() => setAddOpen(false)}
        onSubmit={submitUser}
      />
      <UserModal
        open={!!editUser}
        user={editUser}
        currentUserId={currentUserId}
        onClose={() => setEditUser(null)}
        onSubmit={submitUser}
      />

      <Dialog
        open={!!pendingUser}
        onOpenChange={(value) => {
          if (!value) {
            setPendingUser(null);
            setAction(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {action === "reset" ? "รีเซ็ตรหัสผ่าน" : "เปลี่ยนสถานะผู้ใช้"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {action === "reset"
              ? `ต้องการสร้างรหัสผ่านใหม่ให้ ${pendingUser?.name}?`
              : pendingUser?.isActive
                ? `ต้องการปิดการใช้งาน ${pendingUser?.name}?`
                : `ต้องการเปิดการใช้งาน ${pendingUser?.name}?`}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPendingUser(null);
                setAction(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              variant={action === "reset" ? "default" : "destructive"}
              onClick={() => {
                if (!pendingUser) return;
                void patchUser(
                  pendingUser,
                  action === "reset"
                    ? { resetPassword: true }
                    : { isActive: !pendingUser.isActive }
                );
              }}
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!temporary} onOpenChange={(value) => !value && setTemporary(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              {temporary?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{temporary?.name}</p>
              <p className="text-xs text-muted-foreground">{temporary?.email}</p>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
              <code className="min-w-0 flex-1 truncate text-sm">
                {temporary?.password}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyPassword}
                className="h-8 gap-1"
              >
                <Copy className="h-3.5 w-3.5" />
                คัดลอก
              </Button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              แสดงครั้งเดียว กรุณาส่งต่อให้ผู้ใช้ผ่านช่องทางที่ปลอดภัย
            </p>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setTemporary(null)}>
              เสร็จ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
