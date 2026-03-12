"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CalendarDays,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    href: "/dashboard",
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
  },
  {
    href: "/clients",
    label: "ผู้ประกอบการ",
    icon: Users,
  },
  {
    href: "/tasks",
    label: "งาน",
    icon: CheckSquare,
  },
  {
    href: "/calendar",
    label: "ปฏิทิน",
    icon: CalendarDays,
  },
];

export function Sidebar() {
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
    <aside className="w-64 bg-white border-r border-border flex flex-col h-screen sticky top-0 shadow-sm">
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
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
