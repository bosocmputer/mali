"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Shield, Lock, Save, MessageCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const isSupervisor = session?.user?.role === "SUPERVISOR";
  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [name, setName] = useState(userName);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [lineToken, setLineToken] = useState<{
    token: string;
    expiresAt: string;
    instruction: string;
  } | null>(null);
  const [creatingLineToken, setCreatingLineToken] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        await update({ name: name.trim() });
        toast.success("อัปเดตชื่อเรียบร้อยแล้ว");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "เกิดข้อผิดพลาด");
      } else {
        toast.success("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleCreateLineToken() {
    setCreatingLineToken(true);
    try {
      const res = await fetch("/api/profile/line-link-token", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "ไม่สามารถสร้างโค้ดเชื่อม LINE ได้");
      } else {
        setLineToken(json.data);
        toast.success("สร้างโค้ดเชื่อม LINE แล้ว");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setCreatingLineToken(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Profile Header */}
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarFallback className="bg-primary text-white text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-semibold text-foreground truncate">{userName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{userEmail}</p>
              <Badge
                variant="secondary"
                className={cn(
                  "mt-2 text-xs px-2",
                  isSupervisor
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {isSupervisor ? (
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" /> ผู้จัดการ
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> เจ้าหน้าที่
                  </span>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Name + Change Password — 2 columns on large screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Name */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              แก้ไขชื่อ
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อของคุณ"
                />
              </div>
              <div className="space-y-1.5">
                <Label>อีเมล</Label>
                <Input value={userEmail} disabled className="bg-slate-50 dark:bg-slate-800 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยนอีเมลได้</p>
              </div>
              <Button type="submit" size="sm" disabled={savingName} className="gap-2">
                <Save className="h-4 w-4" />
                {savingName ? "กำลังบันทึก..." : "บันทึกชื่อ"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              เปลี่ยนรหัสผ่าน
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" size="sm" disabled={savingPassword} className="gap-2">
                <Lock className="h-4 w-4" />
                {savingPassword ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            เชื่อมต่อ LINE OA
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">สร้างโค้ดครั้งเดียวสำหรับผูกบัญชี LINE</p>
              <p className="text-xs text-muted-foreground mt-1">
                โค้ดหมดอายุใน 10 นาที และใช้ได้ครั้งเดียว
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateLineToken}
              disabled={creatingLineToken}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", creatingLineToken && "animate-spin")} />
              {creatingLineToken ? "กำลังสร้าง..." : "สร้างโค้ด"}
            </Button>
          </div>

          {lineToken && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                ส่งข้อความนี้ไปที่ LINE OA
              </p>
              <p className="mt-2 font-mono text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                MALI {lineToken.token}
              </p>
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                หมดอายุ {new Date(lineToken.expiresAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
