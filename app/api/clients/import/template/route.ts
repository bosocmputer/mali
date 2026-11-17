import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IMPORT_COLUMNS } from "@/lib/clientImport";
import { toXlsx, xlsxResponse } from "@/lib/excel";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/utils";

/** FR-106: the import template, with an example row and the accepted values. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [rules, users] = await Promise.all([
    prisma.rule.findMany({ where: { taxForm: { not: null } }, select: { taxForm: true }, orderBy: { ruleCode: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  const forms = Array.from(new Set(rules.map((r) => r.taxForm as string)));
  const example = {
    companyName: "บริษัท ตัวอย่าง จำกัด",
    taxId: "0105500000000",
    branchCode: "00000",
    branchName: "",
    businessType: BUSINESS_TYPE_OPTIONS[1],
    fiscalYearEnd: "31/12",
    filingMethod: "ออนไลน์",
    auditorName: "",
    monthlyFee: "3640",
    taxTypes: forms.slice(0, 3).join(", "),
    assigneeEmail: users[0]?.email ?? "",
  };
  const max = Math.max(forms.length, BUSINESS_TYPE_OPTIONS.length, users.length);
  const lists = Array.from({ length: max }, (_, i) => ({
    taxForm: forms[i] ?? "",
    businessType: BUSINESS_TYPE_OPTIONS[i] ?? "",
    user: users[i] ? `${users[i].email} (${users[i].name})` : "",
  }));

  const buf = await toXlsx([
    {
      name: "บริษัท",
      columns: IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.key === "companyName" ? 36 : 22 })),
      rows: [example],
    },
    {
      name: "ค่าที่ใช้ได้",
      columns: [
        { header: "ประเภทภาษี", key: "taxForm", width: 20 },
        { header: "ประเภทธุรกิจ", key: "businessType", width: 24 },
        { header: "อีเมลผู้รับผิดชอบ", key: "user", width: 40 },
      ],
      rows: lists,
    },
  ]);
  return xlsxResponse(buf, "MALI-แม่แบบนำเข้าบริษัท.xlsx");
}
