import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createRuleInDb,
  deleteRuleFromDb,
  DuplicateRuleCodeError,
  getAllRulesFromDb,
  updateRuleInDb,
} from "@/lib/repositories/rules";

const ruleSchema = z.object({
  ruleCode: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  taxForm: z.string().trim().optional(),
  calcMethod: z.enum(["fixed_day", "offset_days", "offset_months"]),
  fixedDay: z.coerce.number().int().min(1).max(31).optional(),
  offset: z.coerce.number().int().min(0).max(366).optional(),
  referenceDate: z.enum(["month_end", "fiscal_year_end", "agm_date"]),
  legalRef: z.string().trim().min(1),
});

const updateRuleSchema = ruleSchema.partial().extend({
  id: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ data: await getAllRulesFromDb() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  try {
    const rule = await createRuleInDb(parsed.data);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateRuleCodeError) {
      return NextResponse.json({ error: "รหัสเกณฑ์นี้มีอยู่แล้ว" }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { id, ...data } = parsed.data;
  try {
    const updated = await updateRuleInDb(id, data);
    if (!updated) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof DuplicateRuleCodeError) {
      return NextResponse.json({ error: "รหัสเกณฑ์นี้มีอยู่แล้ว" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const deleted = await deleteRuleFromDb(id);
  if (!deleted) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json({ message: "Deleted successfully" });
}
