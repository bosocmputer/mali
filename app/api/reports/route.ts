import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findTasksFromDb } from "@/lib/repositories/tasks";
import { lateReport, paymentsReport, performanceReport, type Range } from "@/lib/reports";
import { toXlsx, xlsxResponse, type Sheet } from "@/lib/excel";

/**
 * Supervisor reports (FR-99, FR-102, FR-108) as JSON, or as .xlsx with ?format=xlsx (FR-103).
 * ?type=payments|late|performance&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const type = sp.get("type");
  const range: Range = { from: sp.get("from") ?? "", to: sp.get("to") ?? "" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.from) || !/^\d{4}-\d{2}-\d{2}$/.test(range.to) || range.from > range.to) {
    return NextResponse.json({ error: "ช่วงวันที่ไม่ถูกต้อง" }, { status: 400 });
  }
  const tasks = await findTasksFromDb({ isSupervisor: true, userId: session.user.id });
  const xlsx = sp.get("format") === "xlsx";
  const suffix = `${range.from}_${range.to}`;

  if (type === "payments") {
    const r = paymentsReport(tasks, range);
    if (!xlsx) return NextResponse.json({ data: r });
    const sheets: Sheet[] = [
      {
        name: "เงินรับชำระแทน",
        columns: [
          { header: "บริษัท", key: "company", width: 40 },
          { header: "ประเภทภาษี", key: "taxType" },
          { header: "งวด", key: "period", width: 10 },
          { header: "ยอดภาษี", key: "amount", money: true },
          { header: "ครบกำหนด", key: "dueDate", width: 12 },
          { header: "วันที่ยื่น", key: "filedAt", width: 12 },
          { header: "วันที่รับเงินลูกค้า", key: "clientPaidAt", width: 16 },
          { header: "วันที่ชำระ", key: "officePaidAt", width: 12 },
          { header: "สถานะ", key: "status" },
          { header: "ผู้รับผิดชอบ", key: "assignee" },
        ],
        rows: r.rows,
      },
      {
        name: "สรุป",
        columns: [
          { header: "รายการ", key: "label", width: 30 },
          { header: "ยอด (บาท)", key: "amount", money: true },
        ],
        rows: [
          { label: "รอรับจากลูกค้า", amount: r.summary.awaitingClient },
          { label: "รับแล้วแต่ยังไม่ชำระ", amount: r.summary.receivedNotPaid },
          { label: "ชำระแล้ว", amount: r.summary.paid },
        ],
      },
    ];
    return xlsxResponse(await toXlsx(sheets), `MALI-เงินรับชำระแทน-${suffix}.xlsx`);
  }

  if (type === "late") {
    const r = lateReport(tasks, range);
    if (!xlsx) return NextResponse.json({ data: r });
    return xlsxResponse(
      await toXlsx([
        {
          name: "งานล่าช้า",
          columns: [
            { header: "บริษัท", key: "company", width: 40 },
            { header: "ประเภทภาษี", key: "taxType" },
            { header: "งวด", key: "period", width: 10 },
            { header: "ครบกำหนด", key: "dueDate", width: 12 },
            { header: "วันที่ยื่น", key: "filedAt", width: 12 },
            { header: "วันที่ชำระ", key: "officePaidAt", width: 12 },
            { header: "ล่าช้า", key: "kind" },
            { header: "เบี้ยปรับ", key: "penalty", money: true },
            { header: "เงินเพิ่ม", key: "surcharge", money: true },
            { header: "ผู้รับภาระ", key: "borneBy" },
            { header: "สาเหตุ", key: "reason", width: 30 },
            { header: "ผู้รับผิดชอบ", key: "assignee" },
          ],
          rows: r.rows,
        },
        {
          name: "สรุปตามบริษัท",
          columns: [
            { header: "บริษัท", key: "company", width: 40 },
            { header: "จำนวนงานล่าช้า", key: "count" },
            { header: "เบี้ยปรับ", key: "penalty", money: true },
            { header: "เงินเพิ่ม", key: "surcharge", money: true },
            { header: "สำนักงานรับภาระ", key: "officeBorne", money: true },
          ],
          rows: r.byCompany,
        },
      ]),
      `MALI-ล่าช้า-เบี้ยปรับ-${suffix}.xlsx`
    );
  }

  if (type === "performance") {
    const rows = performanceReport(tasks, range);
    if (!xlsx) return NextResponse.json({ data: rows });
    return xlsxResponse(
      await toXlsx([
        {
          name: "ผลงานรายพนักงาน",
          columns: [
            { header: "พนักงาน", key: "name", width: 24 },
            { header: "งานทั้งหมด", key: "total" },
            { header: "เสร็จสิ้น", key: "done" },
            { header: "ทันกำหนด", key: "onTime" },
            { header: "ล่าช้า", key: "late" },
            { header: "% ทันกำหนด", key: "onTimePct" },
            { header: "ค้างอยู่ตอนนี้", key: "openNow" },
            { header: "เกินกำหนดตอนนี้", key: "overdueNow" },
          ],
          rows,
        },
      ]),
      `MALI-ผลงาน-${suffix}.xlsx`
    );
  }

  return NextResponse.json({ error: "type ต้องเป็น payments, late หรือ performance" }, { status: 400 });
}
