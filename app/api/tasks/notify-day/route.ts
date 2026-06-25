import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotificationInDb } from "@/lib/repositories/notifications";
import { sendLineMessage } from "@/lib/cronNotify";
import { formatThaiDate } from "@/lib/utils";

const COOLDOWN_MINUTES = 10;
const MAX_FUTURE_DAYS = 7;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const date: string = typeof body?.date === "string" ? body.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date ไม่ถูกต้อง (YYYY-MM-DD)" }, { status: 400 });
  }

  // block วันที่เกิน 7 วันในอนาคต
  const targetDate = new Date(date + "T00:00:00.000Z");
  const now = new Date();
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > MAX_FUTURE_DAYS) {
    return NextResponse.json(
      { error: `ไม่สามารถส่งล่วงหน้าเกิน ${MAX_FUTURE_DAYS} วันได้ — cron จะส่งอัตโนมัติ` },
      { status: 400 }
    );
  }

  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งค่า LINE Channel Access Token" }, { status: 503 });
  }

  // งานทั้งหมดของวันนั้น (ไม่ filter status — ส่งทุกงานที่ยังไม่ SUBMITTED)
  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd   = new Date(date + "T23:59:59.999Z");

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: dayStart, lte: dayEnd },
      status: { not: "SUBMITTED" },
    },
    include: { client: true, taxType: true, assignedUser: true },
    orderBy: { dueDate: "asc" },
  });

  if (tasks.length === 0) {
    return NextResponse.json({ ok: false, reason: "ไม่มีงานค้างในวันที่เลือก" });
  }

  // Cooldown: key = date + userId (ไม่ block ข้ามวัน)
  const cooldownStart = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  const recentLogs = await prisma.notificationLog.findMany({
    where: {
      type: "MANUAL",
      sentAt: { gte: cooldownStart },
      task: { dueDate: { gte: dayStart, lte: dayEnd } },
    },
    select: { userId: true, sentAt: true },
  });
  const recentUserIds = new Set(recentLogs.map((l) => l.userId));

  // group by assignedUserId
  const byUser = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const list = byUser.get(task.assignedUserId) ?? [];
    list.push(task);
    byUser.set(task.assignedUserId, list);
  }

  const results: { name: string; sent: boolean; reason?: string }[] = [];

  for (const [userId, userTasks] of Array.from(byUser.entries())) {
    const user = userTasks[0].assignedUser;

    if (!user.lineUserId) {
      results.push({ name: user.name, sent: false, reason: "ไม่มี LINE" });
      continue;
    }

    if (recentUserIds.has(userId)) {
      const minutesAgo = Math.ceil((Date.now() - Math.min(...recentLogs.filter(l => l.userId === userId).map(l => l.sentAt.getTime()))) / 60000);
      results.push({ name: user.name, sent: false, reason: `ส่งไปแล้วเมื่อ ${minutesAgo} นาทีที่แล้ว` });
      continue;
    }

    // Log
    await Promise.all(
      userTasks.map((t) => createNotificationInDb({ taskId: t.id, userId, type: "MANUAL" }))
    );

    // Build Flex Message สำหรับงานวันนี้
    const isOverdueDate = targetDate < new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
    const headerColor = isOverdueDate ? "#C0392B" : "#1E3A5F";
    const thaiDateStr = formatThaiDate(date);
    const firstName = user.name.split(" ")[0];

    const FLEX_MAX = 10;
    const shown = userTasks.slice(0, FLEX_MAX);
    const overflow = userTasks.length - shown.length;

    const taskRows: unknown[] = shown.flatMap((t, i) => {
      const emoji = t.status === "PROCESSING" ? "⏳" : "📌";
      const row = {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: `${emoji} ${t.taxType.name}`,
                weight: "bold",
                size: "sm",
                color: isOverdueDate ? "#C0392B" : "#111111",
                flex: 2,
                wrap: true,
              },
              {
                type: "text",
                text: t.client.companyName,
                size: "sm",
                color: "#444444",
                flex: 3,
                wrap: true,
                align: "end" as const,
              },
            ],
          },
          {
            type: "text",
            text: t.status === "PROCESSING" ? "กำลังดำเนินการ" : "รอดำเนินการ",
            size: "xs",
            color: t.status === "PROCESSING" ? "#D97706" : "#888888",
          },
        ],
      };
      return i < shown.length - 1 ? [row, { type: "separator", margin: "sm" }] : [row];
    });

    if (overflow > 0) {
      taskRows.push({ type: "separator", margin: "sm" });
      taskRows.push({ type: "text", text: `และอีก ${overflow} งาน...`, size: "xs", color: "#888888", margin: "sm" });
    }

    const flex = {
      type: "flex",
      altText: `📅 [MALI] งานครบกำหนด ${thaiDateStr} — ${user.name} — ${userTasks.length} งาน`,
      contents: {
        type: "bubble",
        size: "giga",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: headerColor,
          paddingAll: "lg",
          contents: [
            { type: "text", text: `📅 [MALI] งานครบกำหนด`, color: "#FFFFFF", weight: "bold", size: "md" },
            { type: "text", text: `${firstName} — ${thaiDateStr}`, color: "#DDDDDD", size: "sm", margin: "xs" },
            { type: "text", text: `${userTasks.length} งาน${isOverdueDate ? " (เลยกำหนดแล้ว)" : ""}`, color: isOverdueDate ? "#ffaaaa" : "#DDDDDD", size: "xs", margin: "xs" },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "lg",
          contents: taskRows as object[],
        },
        footer: {
          type: "box",
          layout: "vertical",
          backgroundColor: isOverdueDate ? "#FDF0EE" : "#F5F5F5",
          paddingAll: "md",
          contents: [{
            type: "text",
            text: isOverdueDate ? "⚠️ งานเหล่านี้เลยกำหนดแล้ว — โปรดตรวจสอบด่วน" : "กรุณาดำเนินการให้ทันกำหนด",
            size: "xs",
            color: isOverdueDate ? "#C0392B" : "#888888",
            align: "center" as const,
            wrap: true,
          }],
        },
      },
    };

    try {
      await sendLineMessage(user.lineUserId, flex);
      results.push({ name: user.name, sent: true });
    } catch {
      results.push({ name: user.name, sent: false, reason: "ส่งไม่สำเร็จ" });
    }
  }

  const sentCount    = results.filter((r) => r.sent).length;
  const skippedCount = results.filter((r) => !r.sent).length;

  return NextResponse.json({ ok: true, sentCount, skippedCount, results });
}
