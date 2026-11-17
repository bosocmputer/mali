import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findTasksFromDb } from "@/lib/repositories/tasks";
import { parseTaskQuery } from "@/lib/taskQuery";
import { toXlsx, xlsxResponse } from "@/lib/excel";
import { clientLabel } from "@/lib/clientLabel";
import { PAYMENT_TYPE_LABEL, STATUS_LABEL } from "@/lib/taskWorkflow";
import { lateness } from "@/lib/taskLateness";
import { bangkokDateString } from "@/lib/utils";

/** FR-103: the task table, with the filters on screen, as .xlsx (supervisors). */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tasks = await findTasksFromDb(parseTaskQuery(new URL(req.url).searchParams, session.user));
  const rows = tasks.map((t) => {
    const l = lateness(t);
    return {
      company: clientLabel(t.client),
      taxId: t.client.taxId ?? "",
      taxType: t.taxType.name,
      period: t.fiscalYearEndDate.slice(0, 10),
      dueDate: t.dueDate.slice(0, 10),
      status: STATUS_LABEL[t.status],
      paymentType: t.hasPayment ? PAYMENT_TYPE_LABEL[t.paymentType] : "ไม่มีการชำระ",
      amount: t.taxAmount ?? null,
      filedAt: t.filedAt ?? "",
      officePaidAt: t.officePaidAt ?? "",
      late: l.late ? "ล่าช้า" : "",
      assignee: t.assignedUser.name,
      note: t.note ?? "",
    };
  });
  const buf = await toXlsx([
    {
      name: "งาน",
      columns: [
        { header: "บริษัท", key: "company", width: 40 },
        { header: "เลขนิติบุคคล", key: "taxId", width: 16 },
        { header: "ประเภทภาษี", key: "taxType" },
        { header: "รอบงาน", key: "period", width: 12 },
        { header: "ครบกำหนด", key: "dueDate", width: 12 },
        { header: "สถานะ", key: "status" },
        { header: "ประเภทการชำระ", key: "paymentType", width: 18 },
        { header: "ยอดภาษี", key: "amount", money: true },
        { header: "วันที่ยื่น", key: "filedAt", width: 12 },
        { header: "วันที่ชำระ", key: "officePaidAt", width: 12 },
        { header: "ล่าช้า", key: "late", width: 8 },
        { header: "ผู้รับผิดชอบ", key: "assignee" },
        { header: "หมายเหตุ", key: "note", width: 30 },
      ],
      rows,
    },
  ]);
  return xlsxResponse(buf, `MALI-งาน-${bangkokDateString()}.xlsx`);
}
