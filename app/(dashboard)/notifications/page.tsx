import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllNotifications, getTaskById, getUserById } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell, AlertTriangle, MessageSquare, BellRing } from "lucide-react";
import { formatThaiDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_CONFIG = {
  REMINDER:   { label: "แจ้งเตือน",        color: "bg-blue-50 text-blue-700 border-blue-200",   Icon: Bell },
  ESCALATION: { label: "แจ้งเตือนหัวหน้า", color: "bg-red-50 text-red-700 border-red-200",       Icon: AlertTriangle },
  MANUAL:     { label: "ส่งด่วน",           color: "bg-amber-50 text-amber-700 border-amber-200", Icon: MessageSquare },
} as const;

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const isSupervisor = session?.user?.role === "SUPERVISOR";
  const userId = session?.user?.id ?? "";

  const notifications = getAllNotifications()
    .filter((n) => isSupervisor || n.userId === userId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .map((n) => {
      const task = getTaskById(n.taskId);
      const user = getUserById(n.userId);
      return { ...n, task, user };
    });

  const reminderCount   = notifications.filter((n) => n.type === "REMINDER").length;
  const escalationCount = notifications.filter((n) => n.type === "ESCALATION").length;
  const manualCount     = notifications.filter((n) => n.type === "MANUAL").length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">ประวัติการแจ้งเตือน</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isSupervisor ? "การแจ้งเตือนทั้งหมดในระบบ" : "การแจ้งเตือนของคุณ"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm border-blue-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reminderCount}</p>
              <p className="text-xs text-muted-foreground">แจ้งเตือนปกติ</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{escalationCount}</p>
              <p className="text-xs text-muted-foreground">แจ้งเตือนหัวหน้า</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-amber-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <MessageSquare className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{manualCount}</p>
              <p className="text-xs text-muted-foreground">ส่งด่วน (Manual)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            รายการแจ้งเตือนทั้งหมด ({notifications.length} รายการ)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <BellRing className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">ยังไม่มีประวัติการแจ้งเตือน</p>
              <p className="text-xs text-muted-foreground/60 mt-1">การแจ้งเตือนจะปรากฏที่นี่เมื่อระบบส่งการแจ้งเตือน</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="pl-6">เวลาที่ส่ง</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>งาน</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>วันครบกำหนด</TableHead>
                  {isSupervisor && <TableHead className="pr-6">ผู้รับ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG];
                  const Icon = cfg.Icon;
                  return (
                    <TableRow key={n.id} className="hover:bg-slate-50/50">
                      <TableCell className="pl-6 text-sm text-muted-foreground whitespace-nowrap">
                        {formatThaiDate(n.sentAt)}
                        <span className="ml-1 text-xs opacity-60">
                          {new Date(n.sentAt).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs gap-1", cfg.color)}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {n.task ? (
                          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {n.task.taxType.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {n.task?.client.companyName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {n.task ? formatThaiDate(n.task.dueDate) : "—"}
                      </TableCell>
                      {isSupervisor && (
                        <TableCell className="pr-6 text-sm text-muted-foreground">
                          {n.user?.name ?? "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
