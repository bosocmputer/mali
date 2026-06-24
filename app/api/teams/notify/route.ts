import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserByIdFromDb } from "@/lib/repositories/users";
import { sendLineMessage } from "@/lib/cronNotify";
import { formatThaiDate } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { teamId } = await req.json().catch(() => ({}));
  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  // โหลดทีมพร้อม members
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { include: { user: true } } },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const lead = await getUserByIdFromDb(team.leadUserId);
  if (!lead?.lineUserId) {
    return NextResponse.json(
      { error: `หัวหน้าทีม "${lead?.name ?? "?"}" ยังไม่ได้เชื่อมต่อ LINE` },
      { status: 400 }
    );
  }

  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "ระบบยังไม่ได้ตั้งค่า LINE Channel Access Token" },
      { status: 503 }
    );
  }

  // งานเดือนปัจจุบัน (Gregorian) ของสมาชิกทุกคนในทีม
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const memberIds = team.members.map((m) => m.userId);
  const allMemberIds = Array.from(new Set([team.leadUserId, ...memberIds]));

  const tasks = await prisma.task.findMany({
    where: {
      assignedUserId: { in: allMemberIds },
      dueDate: { gte: monthStart, lte: monthEnd },
    },
    include: {
      taxType: true,
      client: true,
      assignedUser: true,
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  // ── สร้าง Flex Message แบบ C ─────────────────────────────────────────────
  const thaiMonth = now.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  // ภาพรวมรายคน
  const memberSummary = allMemberIds.map((uid) => {
    const ut = tasks.filter((t) => t.assignedUserId === uid);
    const name = team.members.find((m) => m.userId === uid)?.user.name
      ?? (uid === team.leadUserId ? lead.name : uid);
    const submitted  = ut.filter((t) => t.status === "SUBMITTED").length;
    const processing = ut.filter((t) => t.status === "PROCESSING").length;
    const todo       = ut.filter((t) => t.status === "TODO" && new Date(t.dueDate) >= now).length;
    const overdue    = ut.filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now).length;
    return { name, total: ut.length, submitted, processing, todo, overdue };
  }).filter((m) => m.total > 0);

  // งานที่ยังไม่เสร็จ (OVERDUE + TODO + PROCESSING) เรียงตาม dueDate
  const pending = tasks.filter((t) => t.status !== "SUBMITTED");

  const totalTasks    = tasks.length;
  const totalSubmitted = tasks.filter((t) => t.status === "SUBMITTED").length;
  const totalOverdue  = tasks.filter((t) => t.status !== "SUBMITTED" && new Date(t.dueDate) < now).length;

  // ── Flex bubble ──────────────────────────────────────────────────────────
  const summaryRows = memberSummary.flatMap((m, i) => {
    const row = {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: m.name, size: "sm", color: "#111111", flex: 3, wrap: true },
        { type: "text", text: `${m.total} งาน`, size: "sm", color: "#444444", flex: 2, align: "end" as const },
        {
          type: "text",
          text: `✓${m.submitted} ⏳${m.processing + m.todo}${m.overdue > 0 ? ` 🔴${m.overdue}` : ""}`,
          size: "xs", color: m.overdue > 0 ? "#C0392B" : "#888888", flex: 3, align: "end" as const,
        },
      ],
    };
    return i < memberSummary.length - 1
      ? [row, { type: "separator", margin: "sm" as const }]
      : [row];
  });

  const PENDING_MAX = 8;
  const shownPending = pending.slice(0, PENDING_MAX);
  const overflow = pending.length - shownPending.length;

  const pendingRows = shownPending.flatMap((t, i) => {
    const overdue = t.status !== "SUBMITTED" && new Date(t.dueDate) < now;
    const row = {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: `${overdue ? "🔴" : "📌"} ${t.taxType.name}`,
          size: "sm", color: overdue ? "#C0392B" : "#111111", flex: 3, wrap: true,
        },
        {
          type: "box", layout: "vertical", flex: 4, contents: [
            { type: "text", text: t.client.companyName, size: "xs", color: "#444444", wrap: true },
            { type: "text", text: `${t.assignedUser.name.split(" ")[0]} · ครบ ${formatThaiDate(t.dueDate)}`, size: "xs", color: "#888888" },
          ],
        },
      ],
    };
    return i < shownPending.length - 1
      ? [row, { type: "separator", margin: "sm" as const }]
      : [row];
  });

  if (overflow > 0) {
    pendingRows.push({ type: "separator", margin: "sm" } as never);
    pendingRows.push({
      type: "text", text: `และอีก ${overflow} งาน...`,
      size: "xs", color: "#888888", margin: "sm",
    } as never);
  }

  const flex = {
    type: "flex",
    altText: `📊 [MALI] สรุปงานทีม ${team.name} — ${thaiMonth}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box", layout: "vertical",
        backgroundColor: "#1E3A5F", paddingAll: "lg",
        contents: [
          { type: "text", text: `📊 [MALI] สรุปงานทีม`, color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `${team.name} — ${thaiMonth}`, color: "#DDDDDD", size: "sm", margin: "xs" },
          {
            type: "box", layout: "horizontal", margin: "md",
            contents: [
              { type: "text", text: `ทั้งหมด ${totalTasks}`, size: "xs", color: "#FFFFFF", flex: 1 },
              { type: "text", text: `ยื่นแล้ว ${totalSubmitted}`, size: "xs", color: "#52d68a", flex: 1, align: "center" as const },
              { type: "text", text: totalOverdue > 0 ? `เกินกำหนด ${totalOverdue}` : "ไม่มีงานเกิน", size: "xs", color: totalOverdue > 0 ? "#ff6b6b" : "#aaaaaa", flex: 1, align: "end" as const },
            ],
          },
        ],
      },
      body: {
        type: "box", layout: "vertical", spacing: "lg", paddingAll: "lg",
        contents: [
          // section: ภาพรวมรายคน
          {
            type: "box", layout: "vertical", spacing: "sm",
            contents: [
              { type: "text", text: "👤 ภาพรวมรายคน", weight: "bold", size: "sm", color: "#333333" },
              { type: "separator" },
              ...summaryRows,
            ],
          },
          // section: งานที่ยังไม่เสร็จ
          ...(pendingRows.length > 0 ? [{
            type: "box", layout: "vertical", spacing: "sm",
            contents: [
              { type: "text", text: `📋 งานที่ยังไม่เสร็จ (${pending.length} งาน)`, weight: "bold", size: "sm", color: "#333333" },
              { type: "separator" },
              ...pendingRows,
            ],
          }] : [{
            type: "text", text: "✅ งานทุกชิ้นเดือนนี้เสร็จแล้ว!", size: "sm", color: "#10B981", align: "center" as const,
          }]),
        ],
      },
      footer: {
        type: "box", layout: "vertical", backgroundColor: "#F5F5F5", paddingAll: "md",
        contents: [{
          type: "text",
          text: `ส่งโดย Supervisor · ${now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`,
          size: "xs", color: "#888888", align: "center" as const,
        }],
      },
    },
  };

  try {
    await sendLineMessage(lead.lineUserId, flex);
    return NextResponse.json({ ok: true, sentTo: lead.name });
  } catch (e) {
    return NextResponse.json(
      { error: `ส่งข้อความไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
}
