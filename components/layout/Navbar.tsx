"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  User,
  LogOut,
  Shield,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatThaiDate } from "@/lib/utils";
import { Task } from "@/types";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "แดชบอร์ด",
  "/clients": "ผู้ประกอบการ",
  "/tasks": "งาน",
  "/calendar": "ปฏิทินภาษี",
  "/profile": "โปรไฟล์",
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const isSupervisor = session?.user?.role === "SUPERVISOR";
  const userName = session?.user?.name ?? "ผู้ใช้งาน";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const title =
    Object.entries(PAGE_TITLES).find(([path]) =>
      pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
    )?.[1] ?? "MALI";

  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);

  useEffect(() => {
    async function fetchOverdue() {
      try {
        const res = await fetch("/api/tasks");
        const json = await res.json();
        if (res.ok) {
          const now = new Date();
          const overdue = (json.data ?? []).filter(
            (t: Task) =>
              t.status !== "SUBMITTED" && new Date(t.dueDate) < now
          );
          setOverdueTasks(overdue);
        }
      } catch {
        // silent
      }
    }
    fetchOverdue();
  }, [pathname]);

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="relative p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Bell className="h-5 w-5" />
              {overdueTasks.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {overdueTasks.length > 9 ? "9+" : overdueTasks.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              การแจ้งเตือน
              {overdueTasks.length > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0 h-4">
                  {overdueTasks.length} เกินกำหนด
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {overdueTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                ไม่มีการแจ้งเตือน
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                {overdueTasks.slice(0, 10).map((task) => (
                  <DropdownMenuItem
                    key={task.id}
                    className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                    onClick={() => router.push("/tasks")}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {task.client.companyName}
                      </span>
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1 rounded ml-auto flex-shrink-0">
                        {task.taxType.name}
                      </span>
                    </div>
                    <p className="text-xs text-red-500 pl-5">
                      ครบกำหนด {formatThaiDate(task.dueDate)}
                    </p>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            )}
            {overdueTasks.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs text-center text-primary justify-center cursor-pointer"
                  onClick={() => router.push("/tasks")}
                >
                  ดูงานทั้งหมด →
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none text-foreground">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSupervisor ? "ผู้จัดการ" : "เจ้าหน้าที่"}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{userName}</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs px-1.5 py-0 h-4 mt-0.5",
                      isSupervisor
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {isSupervisor ? (
                      <span className="flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" /> ผู้จัดการ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User className="h-2.5 w-2.5" /> เจ้าหน้าที่
                      </span>
                    )}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/profile")}
            >
              <User className="h-4 w-4 mr-2" />
              โปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
