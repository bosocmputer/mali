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
  Clock,
  MessageCircle,
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
  "/clients": "ข้อมูลบริษัท/ห้างหุ้นส่วนฯ",
  "/tasks": "งาน",
  "/calendar": "ปฏิทินภาษี",
  "/notifications": "ประวัติการแจ้งเตือน",
  "/settings/holidays": "วันหยุดราชการ",
  "/settings/rules": "เกณฑ์การยื่นแบบ",
  "/settings/teams": "จัดการทีม",
  "/settings/users": "จัดการผู้ใช้",
  "/profile": "โปรไฟล์",
  "/guide": "คู่มือการใช้งาน",
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
  const [dueSoonTasks, setDueSoonTasks] = useState<Task[]>([]);
  const [lineLinked, setLineLinked] = useState<boolean | null>(null); // null = ยังไม่รู้

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => setLineLinked(!!json?.lineUserId))
      .catch(() => setLineLinked(true)); // fail-safe: ไม่แสดง dot ถ้า fetch ไม่ได้
  }, [pathname]);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/tasks", { next: { revalidate: 60 } } as RequestInit);
        const json = await res.json();
        if (res.ok) {
          const now = new Date();
          const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
          const allTasks: Task[] = json.data ?? [];
          const overdue = allTasks.filter(
            (t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now
          );
          const soon = allTasks.filter(
            (t) =>
              t.status !== "SUBMITTED" &&
              new Date(t.dueDate) >= now &&
              new Date(t.dueDate) <= in5Days
          );
          setOverdueTasks(overdue);
          setDueSoonTasks(soon);
        }
      } catch {
        // silent
      }
    }
    fetchAlerts();
  }, [pathname]);

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between pl-14 pr-4 md:px-6 sticky top-0 z-20 shadow-sm">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="relative p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Bell className="h-5 w-5" />
              {(overdueTasks.length + dueSoonTasks.length) > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-60" />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {(overdueTasks.length + dueSoonTasks.length) > 9 ? "9+" : (overdueTasks.length + dueSoonTasks.length)}
                  </span>
                </>
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
              {dueSoonTasks.length > 0 && (
                <Badge className="ml-1 text-xs px-1.5 py-0 h-4 bg-amber-500 hover:bg-amber-500">
                  {dueSoonTasks.length} ใกล้ครบ
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {overdueTasks.length === 0 && dueSoonTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                ไม่มีการแจ้งเตือน
              </div>
            ) : (
              <ScrollArea className="max-h-72">
                {overdueTasks.length > 0 && (
                  <div className="px-2 pt-2 pb-1">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 px-1 mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> เกินกำหนด ({overdueTasks.length})
                    </p>
                    {overdueTasks.slice(0, 5).map((task) => (
                      <DropdownMenuItem
                        key={task.id}
                        className="flex flex-col items-start gap-0.5 py-2 cursor-pointer rounded-md"
                        onClick={() => router.push("/tasks?status=OVERDUE")}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {task.client.companyName}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 rounded ml-auto flex-shrink-0">
                            {task.taxType.name}
                          </span>
                        </div>
                        <p className="text-xs text-red-500 dark:text-red-400 pl-5">
                          ครบกำหนด {formatThaiDate(task.dueDate)}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                {overdueTasks.length > 0 && dueSoonTasks.length > 0 && (
                  <DropdownMenuSeparator />
                )}
                {dueSoonTasks.length > 0 && (
                  <div className="px-2 pt-1 pb-2">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 px-1 mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> ใกล้ครบกำหนด ≤7 วัน ({dueSoonTasks.length})
                    </p>
                    {dueSoonTasks.slice(0, 5).map((task) => (
                      <DropdownMenuItem
                        key={task.id}
                        className="flex flex-col items-start gap-0.5 py-2 cursor-pointer rounded-md"
                        onClick={() => router.push("/tasks")}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {task.client.companyName}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 rounded ml-auto flex-shrink-0">
                            {task.taxType.name}
                          </span>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 pl-5">
                          ครบกำหนด {formatThaiDate(task.dueDate)}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
            {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
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
              <span className="relative inline-flex">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {lineLinked === false && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
                )}
              </span>
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
            {lineLinked === false && (
              <DropdownMenuItem
                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                onClick={() => router.push("/profile")}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                เชื่อมต่อ LINE
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer"
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
