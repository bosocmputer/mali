"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, UserRoundCog } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role, User } from "@/types";

interface UserModalProps {
  open: boolean;
  user?: User | null;
  currentUserId: string;
  onClose: () => void;
  onSubmit: (payload: {
    id?: string;
    name: string;
    email?: string;
    role: Role;
    password?: string;
  }) => Promise<void>;
}

const DEFAULT_FORM = {
  name: "",
  email: "",
  role: "STAFF" as Role,
  password: "",
};

export function UserModal({
  open,
  user,
  currentUserId,
  onClose,
  onSubmit,
}: UserModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        role: user.role,
        password: "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setError(null);
  }, [user, open]);

  function handleClose() {
    if (loading) return;
    setForm(DEFAULT_FORM);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้");
      return;
    }
    if (!user && !form.email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }
    if (form.password && form.password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (user?.id === currentUserId && form.role !== "SUPERVISOR") {
      setError("ไม่สามารถเปลี่ยนบทบาทของตัวเองออกจากผู้จัดการได้");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        ...(user ? { id: user.id } : {}),
        name: form.name.trim(),
        ...(!user ? { email: form.email.trim() } : {}),
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const Icon = user ? UserRoundCog : UserPlus;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {user ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">ชื่อ *</Label>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="ชื่อผู้ใช้งาน"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-email">อีเมล *</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              disabled={!!user}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>บทบาท *</Label>
            <Select
              value={form.role}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, role: value as Role }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกบทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">เจ้าหน้าที่</SelectItem>
                <SelectItem value="SUPERVISOR">ผู้จัดการ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!user && (
            <div className="space-y-1.5">
              <Label htmlFor="user-password">รหัสผ่านเริ่มต้น</Label>
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="เว้นว่างเพื่อให้ระบบสร้างให้"
              />
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/50">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
