import { daysUntil, formatThaiDate } from "@/lib/utils";

export type TaskItem = { taxType: string; company: string; dueDate: string; url?: string };

export const FLEX_MAX_ITEMS = 10;
export const VPN_NOTICE = "🔒 ต้องเชื่อมต่อ VPN ก่อนกดเปิด MALI";
// Main reminder cards have no button: the rows themselves open MALI, so the hint says where to tap
export const TAP_TO_OPEN_NOTICE = "🔒 กดที่งานเพื่อเปิด MALI — ต้องเชื่อมต่อ VPN ก่อน";
// LINE limits a button label to 20 characters
export const OPEN_MALI_LABEL = "เปิด MALI";

/** Footer rows for the summary cards, which have no per-task rows to tap: VPN reminder + open button. */
export function openMaliFooterContents(url: string, color = "#1E3A5F"): object[] {
  return [
    { type: "text", text: VPN_NOTICE, size: "xs", color: "#555555", align: "center", wrap: true, margin: "md" },
    {
      type: "button",
      style: "primary",
      color,
      height: "sm",
      margin: "sm",
      action: { type: "uri", label: OPEN_MALI_LABEL, uri: url },
    },
  ];
}

function dueSuffix(dueDate: string, now: Date): string {
  const days = daysUntil(dueDate, now);
  if (days < 0) return ` · เกิน ${-days} วัน`;
  if (days === 0) return " · วันนี้";
  if (days === 1) return " · พรุ่งนี้";
  return "";
}

function headerSubtitle(tasks: TaskItem[], daysLeft: number | undefined, now: Date): string {
  if (daysLeft !== undefined) return `(อีก ${daysLeft} วัน) — ${tasks.length} งาน`;

  const days = tasks.map((t) => daysUntil(t.dueDate, now));
  const overdue = days.filter((d) => d < 0).length;
  const today = days.filter((d) => d === 0).length;
  const tomorrow = days.filter((d) => d === 1).length;
  return [
    `${tasks.length} งาน`,
    overdue > 0 ? `เกินกำหนด ${overdue}` : "",
    today > 0 ? `ครบวันนี้ ${today}` : "",
    tomorrow > 0 ? `ครบพรุ่งนี้ ${tomorrow}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildFlexMessage(
  type: "REMINDER" | "ESCALATION",
  tasks: TaskItem[],
  daysLeft?: number,
  options: { listUrl?: string; now?: Date } = {}
): object {
  const now = options.now ?? new Date();
  const isEscalation = type === "ESCALATION";
  const headerColor = isEscalation ? "#C0392B" : "#1E3A5F";
  const headerEmoji = isEscalation ? "🚨" : "📋";
  const headerLabel = isEscalation ? "งานด่วน — ต้องดำเนินการ" : "แจ้งเตือนงานภาษี";
  const dayTag = daysLeft !== undefined ? ` (อีก ${daysLeft} วัน)` : "";

  // Oldest due date first so the ten rows shown are the most urgent ones
  const sorted = [...tasks].sort(
    (a, b) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() ||
      a.company.localeCompare(b.company, "th")
  );
  const shown = sorted.slice(0, FLEX_MAX_ITEMS);
  const overflow = sorted.length - shown.length;

  const taskRows: unknown[] = shown.flatMap((t, i) => {
    const row = {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      ...(t.url ? { action: { type: "uri", label: "เปิดงาน", uri: t.url } } : {}),
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: t.taxType, weight: "bold", size: "sm", color: "#111111", flex: 2, wrap: true },
            { type: "text", text: t.company, size: "sm", color: "#444444", flex: 3, wrap: true, align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: `ครบกำหนด: ${formatThaiDate(t.dueDate)}${dueSuffix(t.dueDate, now)}`,
              size: "xs",
              color: isEscalation ? "#C0392B" : "#888888",
              flex: 1,
              wrap: true,
            },
            ...(t.url
              ? [{ type: "text", text: "›", size: "md", color: "#888888", flex: 0, align: "end", gravity: "center" }]
              : []),
          ],
        },
      ],
    };
    return i < shown.length - 1 ? [row, { type: "separator", margin: "sm" }] : [row];
  });

  // Rows past the first ten are not in the card; tapping this line opens the full matching list
  if (overflow > 0) {
    taskRows.push({ type: "separator", margin: "sm" });
    taskRows.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      ...(options.listUrl ? { action: { type: "uri", label: "ดูทั้งหมด", uri: options.listUrl } } : {}),
      contents: [
        { type: "text", text: `และอีก ${overflow} งาน...`, size: "xs", color: options.listUrl ? "#1E3A5F" : "#888888", flex: 1 },
        ...(options.listUrl
          ? [{ type: "text", text: "›", size: "md", color: "#888888", flex: 0, align: "end", gravity: "center" }]
          : []),
      ],
    });
  }

  const hasTappable = shown.some((t) => t.url) || (overflow > 0 && !!options.listUrl);

  const footerText = isEscalation
    ? "⚠️ งานเหล่านี้ยังไม่เสร็จ — โปรดตรวจสอบด่วน"
    : "กรุณาดำเนินการให้ทันกำหนด";

  const altText = `${headerEmoji} ${headerLabel}${dayTag} — ${tasks.length} งาน`;

  return {
    type: "flex",
    altText,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headerColor,
        paddingAll: "lg",
        contents: [
          { type: "text", text: `${headerEmoji} [MALI] ${headerLabel}`, color: "#FFFFFF", weight: "bold", size: "md", wrap: true },
          { type: "text", text: headerSubtitle(tasks, daysLeft, now), color: "#DDDDDD", size: "sm", margin: "xs", wrap: true },
        ],
      },
      body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "lg", contents: taskRows },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: isEscalation ? "#FDF0EE" : "#F5F5F5",
        paddingAll: "md",
        contents: [
          {
            type: "text",
            text: footerText,
            size: "xs",
            color: isEscalation ? "#C0392B" : "#888888",
            wrap: true,
            align: "center",
          },
          ...(hasTappable
            ? [{ type: "text", text: TAP_TO_OPEN_NOTICE, size: "xs", color: "#555555", align: "center", wrap: true, margin: "md" }]
            : []),
        ],
      },
    },
  };
}
