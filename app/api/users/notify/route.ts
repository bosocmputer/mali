import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { createNotificationInDb } from "@/lib/repositories/notifications";
import { sendLineMessage } from "@/lib/cronNotify";
import { formatThaiDate } from "@/lib/utils";

const COOLDOWN_MINUTES = 10;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await getUserByIdFromDb(userId);
  if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  if (!user.isActive) return NextResponse.json({ error: "ผู้ใช้ถูกปิดใช้งาน" }, { status: 400 });
  if (!user.lineUserId) {
    return NextResponse.json({ error: `${user.name} ยังไม่ได้เชื่อมต่อ LINE` }, { status: 400 });
  }

  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งค่า LINE Channel Access Token" }, { status: 503 });
  }

  // Cooldown: ถ้าส่ง MANUAL ให้ user นี้ไปแล้วภายใน 10 นาที ให้ block
  const cooldownStart = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  const recentLog = await prisma.notificationLog.findFirst({
    where: { userId, type: "MANUAL", sentAt: { gte: cooldownStart } },
    orderBy: { sentAt: "desc" },
  });
  if (recentLog) {
    const minutesAgo = Math.ceil((Date.now() - recentLog.sentAt.getTime()) / 60000);
    const waitLeft = COOLDOWN_MINUTES - minutesAgo;
    return NextResponse.json(
      { error: `ส่งแจ้งเตือนไปแล้วเมื่อ ${minutesAgo} นาทีที่แล้ว — รอ ${waitLeft} นาทีก่อนส่งซ้ำ` },
      { status: 429 }
    );
  }

  // งานทั้งหมดที่ยังไม่ SUBMITTED
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { assignedUserId: userId, status: { not: "SUBMITTED" } },
    include: { client: true, taxType: true },
    orderBy: { dueDate: "asc" },
  });

  if (tasks.length === 0) {
    return NextResponse.json({ ok: false, reason: "ไม่มีงานค้างของผู้ใช้นี้" }, { status: 200 });
  }

  // Log ทุก task ที่ส่ง
  await Promise.all(
    tasks.map((t) => createNotificationInDb({ taskId: t.id, userId, type: "MANUAL" }))
  );

  // Build Flex Message
  const overdueTasks = tasks.filter((t) => new Date(t.dueDate) < now);
  const pendingTasks = tasks.filter((t) => new Date(t.dueDate) >= now);

  const overdueCount   = overdueTasks.length;
  const processingCount = pendingTasks.filter((t) => t.status === "PROCESSING").length;
  const todoCount       = pendingTasks.filter((t) => t.status === "TODO").length;

  const FLEX_MAX = 10;
  const orderedTasks = [...overdueTasks, ...pendingTasks];
  const shown = orderedTasks.slice(0, FLEX_MAX);
  const overflow = orderedTasks.length - shown.length;

  function daysDiff(dueDate: Date): number {
    return Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const taskRows: unknown[] = shown.flatMap((t, i) => {
    const isOverdue = new Date(t.dueDate) < now;
    const emoji = isOverdue ? "🔴" : t.status === "PROCESSING" ? "⏳" : "📌";
    const overdueDays = isOverdue ? daysDiff(new Date(t.dueDate)) : 0;
    const dueLine = isOverdue
      ? `ครบกำหนด: ${formatThaiDate(t.dueDate)}  (เกิน ${overdueDays} วัน)`
      : `ครบกำหนด: ${formatThaiDate(t.dueDate)}`;

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
              color: isOverdue ? "#C0392B" : "#111111",
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
          text: dueLine,
          size: "xs",
          color: isOverdue ? "#C0392B" : "#888888",
        },
      ],
    };

    return i < shown.length - 1
      ? [row, { type: "separator", margin: "sm" }]
      : [row];
  });

  if (overflow > 0) {
    taskRows.push({ type: "separator", margin: "sm" });
    taskRows.push({
      type: "text",
      text: `และอีก ${overflow} งาน...`,
      size: "xs",
      color: "#888888",
      margin: "sm",
    });
  }

  // Summary row สำหรับ header
  const summaryParts: string[] = [];
  if (overdueCount > 0)   summaryParts.push(`🔴 เกินกำหนด ${overdueCount}`);
  if (processingCount > 0) summaryParts.push(`⏳ กำลังดำเนินการ ${processingCount}`);
  if (todoCount > 0)       summaryParts.push(`📌 รอดำเนินการ ${todoCount}`);

  const headerColor = overdueCount > 0 ? "#C0392B" : "#1E3A5F";
  const firstName = user.name.split(" ")[0];

  const flex = {
    type: "flex",
    altText: `📋 [MALI] สรุปงานของคุณ — ${user.name} — ${tasks.length} งาน`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headerColor,
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: `📋 [MALI] สรุปงานของคุณ`,
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
          },
          {
            type: "text",
            text: `${firstName} — ${tasks.length} งานค้าง`,
            color: "#DDDDDD",
            size: "sm",
            margin: "xs",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "xs",
            contents: summaryParts.map((p) => ({
              type: "text",
              text: p,
              size: "xs",
              color: "#FFFFFF",
            })),
          },
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
        backgroundColor: overdueCount > 0 ? "#FDF0EE" : "#F5F5F5",
        paddingAll: "md",
        contents: [
          {
            type: "text",
            text: overdueCount > 0
              ? "⚠️ มีงานเกินกำหนด — โปรดดำเนินการด่วน"
              : "กรุณาดำเนินการให้ทันกำหนด",
            size: "xs",
            color: overdueCount > 0 ? "#C0392B" : "#888888",
            align: "center" as const,
            wrap: true,
          },
        ],
      },
    },
  };

  try {
    await sendLineMessage(user.lineUserId, flex);
    return NextResponse.json({
      ok: true,
      sentTo: user.name,
      taskCount: tasks.length,
      overdueCount,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `ส่งข้อความไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
}
