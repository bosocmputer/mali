import { clientLabel } from "@/lib/clientLabel";
import { prisma } from "@/lib/db";
import { sendLineMessage } from "@/lib/lineClient";
import { VPN_NOTICE } from "@/lib/lineFlex";
import { appUrl, taskLink } from "@/lib/appLinks";
import { formatThaiDate } from "@/lib/utils";
import type { Task } from "@/types";

const baht = (amount?: number) =>
  amount === undefined ? "" : `${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`;

function message(task: Task, headline: string): string {
  const link = taskLink(task.id);
  return [
    headline,
    `${task.taxType.name} · ${clientLabel(task.client)}`,
    [baht(task.taxAmount), `ครบกำหนด ${formatThaiDate(task.dueDate)}`].filter(Boolean).join(" · "),
    `ผู้รับผิดชอบ: ${task.assignedUser.name}`,
    ...(link ? [`เปิดงาน: ${link}`, VPN_NOTICE] : []),
  ].join("\n");
}

async function pushToUsers(userIds: string[], text: string): Promise<void> {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || userIds.length === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true, lineUserId: { not: null } },
    select: { lineUserId: true },
  });
  // A failed LINE push must never undo the status change that already happened.
  await Promise.allSettled(users.map((user) => sendLineMessage(user.lineUserId!, text)));
}

/** FR-79: staff recorded the client's transfer → tell the supervisors it is theirs to pay. */
export async function notifyClientPaid(task: Task): Promise<void> {
  const supervisors = await prisma.user.findMany({
    where: { role: "SUPERVISOR", isActive: true },
    select: { id: true },
  });
  await pushToUsers(
    supervisors.map((s) => s.id),
    message(task, "💰 ลูกค้าชำระแล้ว — รอหัวหน้าชำระ")
  );
}

/** FR-81: supervisor paid the government → tell the person responsible the task is done. */
export async function notifyOfficePaid(task: Task): Promise<void> {
  await pushToUsers([task.assignedUserId], message(task, "✅ หัวหน้าชำระภาษีแล้ว — งานเสร็จสิ้น"));
}

/** FR-69: a staff member added a company — tell the supervisors. */
export async function notifyClientAddedByStaff(companyName: string, staffName: string): Promise<void> {
  const supervisors = await prisma.user.findMany({
    where: { role: "SUPERVISOR", isActive: true },
    select: { id: true },
  });
  const link = appUrl("/clients");
  await pushToUsers(
    supervisors.map((s) => s.id),
    [
      "🏢 มีบริษัทใหม่ในระบบ",
      companyName,
      `เพิ่มโดย ${staffName}`,
      ...(link ? [`ดูข้อมูล: ${link}`, VPN_NOTICE] : []),
    ].join("\n")
  );
}
