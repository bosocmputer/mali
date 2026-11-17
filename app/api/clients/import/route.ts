import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IMPORT_COLUMNS, validateImportRows, type RawImportRow } from "@/lib/clientImport";
import { createClientInDb } from "@/lib/repositories/clients";
import { generateTasksForClient } from "@/lib/taskGenerator";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 1000;

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if (value instanceof Date) return value.toISOString().slice(0, 10);
  }
  return String(value);
}

/**
 * FR-106: POST the filled template (multipart "file"). Without ?commit=1 it only checks and
 * returns what would be saved and what is wrong; with ?commit=1 it saves the valid rows and
 * creates their tasks. Rows are matched by header text, so column order doesn't matter.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 2 MB" }, { status: 413 });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "อ่านไฟล์ไม่ได้ — ใช้ไฟล์ .xlsx จากแม่แบบ" }, { status: 400 });
  }
  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "ไม่พบแผ่นงาน" }, { status: 400 });

  const headerToKey = new Map(IMPORT_COLUMNS.map((c) => [c.header.replace(/\s*\*$/, "").trim(), c.key]));
  const colKeys = new Map<number, string>();
  ws.getRow(1).eachCell((cell, col) => {
    const key = headerToKey.get(cellText(cell.value).replace(/\s*\*$/, "").trim());
    if (key) colKeys.set(col, key);
  });
  if (!Array.from(colKeys.values()).includes("companyName")) {
    return NextResponse.json({ error: "ไม่พบหัวคอลัมน์ของแม่แบบ — ดาวน์โหลดแม่แบบใหม่แล้วกรอกในแผ่นแรก" }, { status: 400 });
  }

  const rows: RawImportRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: RawImportRow = { rowNumber };
    colKeys.forEach((key, col) => {
      (raw as Record<string, unknown>)[key] = cellText(row.getCell(col).value).trim();
    });
    if (Object.entries(raw).some(([k, v]) => k !== "rowNumber" && v)) rows.push(raw);
  });
  if (rows.length === 0) return NextResponse.json({ error: "ไม่มีข้อมูลในไฟล์" }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `นำเข้าได้ครั้งละไม่เกิน ${MAX_ROWS} แถว` }, { status: 400 });

  const [rules, users, existing] = await Promise.all([
    prisma.rule.findMany({ where: { taxForm: { not: null } }, select: { taxForm: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, email: true } }),
    prisma.client.findMany({ where: { taxId: { not: null } }, select: { taxId: true, branchCode: true } }),
  ]);
  const { valid, errors } = validateImportRows(rows, {
    taxForms: new Set(rules.map((r) => r.taxForm as string)),
    usersByEmail: new Map(users.map((u) => [u.email.toLowerCase(), u.id])),
    existingKeys: new Set(existing.map((c) => `${c.taxId}|${c.branchCode}`)),
  });

  if (new URL(req.url).searchParams.get("commit") !== "1") {
    return NextResponse.json({ data: { valid: valid.map((v) => ({ rowNumber: v.rowNumber, companyName: v.companyName, branchCode: v.branchCode })), errors } });
  }

  const created: string[] = [];
  const failed = [...errors];
  let tasks = 0;
  for (const row of valid) {
    try {
      const client = await createClientInDb({
        companyName: row.companyName,
        taxId: row.taxId,
        branchCode: row.branchCode,
        branchName: row.branchName,
        businessType: row.businessType,
        filingMethod: row.filingMethod,
        fiscalYearStart: row.fiscalYearEnd === 12 ? 1 : row.fiscalYearEnd + 1,
        fiscalYearEnd: row.fiscalYearEnd,
        fiscalYearEndDay: row.fiscalYearEndDay,
        assignedStaffId: row.assignedStaffId,
        auditorName: row.auditorName,
        monthlyFee: row.monthlyFee,
        createdById: session.user.id,
        taxTypes: row.taxTypes.map((name) => ({ name, frequency: "ANNUAL" as const })), // frequency comes from the rule
      });
      created.push(client.id);
      if (client.assignedStaffId) {
        tasks += (await generateTasksForClient(client.id, { triggeredBy: session.user.id })).created;
      }
    } catch (error) {
      failed.push({ rowNumber: row.rowNumber, companyName: row.companyName, messages: [error instanceof Error ? error.message.slice(0, 200) : "บันทึกไม่สำเร็จ"] });
    }
  }
  return NextResponse.json({ data: { created: created.length, tasks, errors: failed } });
}
