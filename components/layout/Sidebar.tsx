"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CalendarDays,
  LogOut,
  Shield,
  User,
  Menu,
  X,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/clients", label: "ผู้ประกอบการ", icon: Users },
  { href: "/tasks", label: "งาน", icon: CheckSquare },
  { href: "/calendar", label: "ปฏิทิน", icon: CalendarDays },
  { href: "/profile", label: "โปรไฟล์", icon: UserCircle },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isSupervisor = session?.user?.role === "SUPERVISOR";
  const userName = session?.user?.name ?? "ผู้ใช้งาน";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg font-bold">M</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-primary leading-none">MALI</h1>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
            ระบบจัดการภาษี
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={onClose}
            className="ml-auto p-1 rounded-md text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-white" : "text-muted-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-3">
        <Separator />
      </div>

      {/* User Info + Logout */}
      <div className="px-3 py-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate leading-none mb-1">
              {userName}
            </p>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs px-1.5 py-0 h-4",
                isSupervisor
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {isSupervisor ? (
                <span className="flex items-center gap-1">
                  <Shield className="h-2.5 w-2.5" />
                  ผู้จัดการ
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <User className="h-2.5 w-2.5" />
                  เจ้าหน้าที่
                </span>
              )}
            </Badge>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        aria-label="เปิดเมนู"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white border border-border shadow-sm text-muted-foreground hover:bg-secondary"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col shadow-xl transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-border flex-col h-screen sticky top-0 shadow-sm">
        <SidebarContent />
      </aside>
    </>
  );
}
