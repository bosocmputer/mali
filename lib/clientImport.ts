/**
 * FR-106: company import from the Excel template. Pure validation so it can be tested and so the
 * same check runs for the preview and for the save. Government-site passwords are never read
 * from the file (no column for them; unknown columns are ignored).
 */
export const IMPORT_COLUMNS = [
  { key: "companyName", header: "ชื่อบริษัท *" },
  { key: "taxId", header: "เลขนิติบุคคล (13 หลัก)" },
  { key: "branchCode", header: "รหัสสาขา (00000 = สำนักงานใหญ่)" },
  { key: "branchName", header: "ชื่อสาขา" },
  { key: "businessType", header: "ประเภทธุรกิจ *" },
  { key: "fiscalYearEnd", header: "วันสิ้นรอบบัญชี วว/ดด *" },
  { key: "filingMethod", header: "วิธียื่น (ออนไลน์/กระดาษ)" },
  { key: "auditorName", header: "ผู้สอบบัญชี" },
  { key: "monthlyFee", header: "ค่าบริการรายเดือน" },
  { key: "taxTypes", header: "ประเภทภาษี (คั่นด้วย ,) *" },
  { key: "assigneeEmail", header: "อีเมลผู้รับผิดชอบ" },
] as const;

export type RawImportRow = Partial<Record<(typeof IMPORT_COLUMNS)[number]["key"], string>> & { rowNumber: number };

export interface ImportClient {
  rowNumber: number;
  companyName: string;
  taxId?: string;
  branchCode: string;
  branchName?: string;
  businessType: string;
  fiscalYearEnd: number;
  fiscalYearEndDay: number;
  filingMethod?: "PAPER" | "E_FILING";
  auditorName?: string;
  monthlyFee?: number;
  taxTypes: string[];
  assignedStaffId?: string;
}

export interface ImportContext {
  taxForms: Set<string>;
  usersByEmail: Map<string, string>; // lower-case email -> user id (active users)
  existingKeys: Set<string>; // "taxId|branchCode" already in MALI
}

const lastDay = (month: number) => new Date(Date.UTC(2024, month, 0)).getUTCDate(); // leap year allows 29/02

export function validateImportRows(rows: RawImportRow[], ctx: ImportContext) {
  const valid: ImportClient[] = [];
  const errors: { rowNumber: number; companyName: string; messages: string[] }[] = [];
  const seen = new Map<string, number>();

  for (const raw of rows) {
    const v = (k: keyof RawImportRow) => String(raw[k] ?? "").trim();
    const messages: string[] = [];
    const companyName = v("companyName");
    if (!companyName) messages.push("ไม่มีชื่อบริษัท");

    const taxId = v("taxId").replace(/[\s-]/g, "");
    if (taxId && !/^\d{13}$/.test(taxId)) messages.push("เลขนิติบุคคลต้องเป็นตัวเลข 13 หลัก");

    const branchRaw = v("branchCode");
    const branchCode = branchRaw === "" ? "00000" : /^\d{1,5}$/.test(branchRaw) ? branchRaw.padStart(5, "0") : "";
    if (!branchCode) messages.push("รหัสสาขาต้องเป็นตัวเลขไม่เกิน 5 หลัก");

    if (taxId && branchCode) {
      const key = `${taxId}|${branchCode}`;
      if (ctx.existingKeys.has(key)) messages.push("เลขนิติบุคคลและรหัสสาขานี้มีในระบบแล้ว");
      else if (seen.has(key)) messages.push(`ซ้ำกับแถวที่ ${seen.get(key)} ในไฟล์`);
      else seen.set(key, raw.rowNumber);
    }

    const businessType = v("businessType");
    if (!businessType) messages.push("ไม่มีประเภทธุรกิจ");

    let fiscalYearEnd = 12;
    let fiscalYearEndDay = 31;
    const fy = v("fiscalYearEnd").match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
    if (!fy) messages.push("วันสิ้นรอบบัญชีต้องเป็น วว/ดด เช่น 31/12");
    else {
      fiscalYearEndDay = Number(fy[1]);
      fiscalYearEnd = Number(fy[2]);
      if (fiscalYearEnd < 1 || fiscalYearEnd > 12 || fiscalYearEndDay < 1 || fiscalYearEndDay > lastDay(fiscalYearEnd)) {
        messages.push("วันสิ้นรอบบัญชีไม่ใช่วันที่จริง");
      }
    }

    const fm = v("filingMethod");
    const filingMethod = fm === "" ? undefined : /ออนไลน์|e-?filing|internet/i.test(fm) ? "E_FILING" : /กระดาษ|paper/i.test(fm) ? "PAPER" : null;
    if (filingMethod === null) messages.push("วิธียื่นต้องเป็น ออนไลน์ หรือ กระดาษ");

    const feeRaw = v("monthlyFee").replace(/,/g, "");
    const monthlyFee = feeRaw === "" ? undefined : Number(feeRaw);
    if (monthlyFee !== undefined && (Number.isNaN(monthlyFee) || monthlyFee < 0)) messages.push("ค่าบริการต้องเป็นตัวเลข");

    const taxTypes = Array.from(new Set(v("taxTypes").split(/[,\n]/).map((s) => s.trim()).filter(Boolean)));
    if (taxTypes.length === 0) messages.push("ไม่มีประเภทภาษี");
    const unknown = taxTypes.filter((t) => !ctx.taxForms.has(t));
    if (unknown.length) messages.push(`ไม่รู้จักประเภทภาษี: ${unknown.join(", ")} (ต้องตรงกับหน้าเกณฑ์การยื่นแบบ)`);

    const email = v("assigneeEmail").toLowerCase();
    const assignedStaffId = email ? ctx.usersByEmail.get(email) : undefined;
    if (email && !assignedStaffId) messages.push(`ไม่พบผู้ใช้อีเมล ${email}`);

    if (messages.length) {
      errors.push({ rowNumber: raw.rowNumber, companyName, messages });
      continue;
    }
    valid.push({
      rowNumber: raw.rowNumber,
      companyName,
      ...(taxId ? { taxId } : {}),
      branchCode,
      ...(v("branchName") ? { branchName: v("branchName") } : {}),
      businessType,
      fiscalYearEnd,
      fiscalYearEndDay,
      ...(filingMethod ? { filingMethod } : {}),
      ...(v("auditorName") ? { auditorName: v("auditorName") } : {}),
      ...(monthlyFee !== undefined ? { monthlyFee } : {}),
      taxTypes,
      ...(assignedStaffId ? { assignedStaffId } : {}),
    });
  }
  return { valid, errors };
}
