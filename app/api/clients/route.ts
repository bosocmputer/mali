import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ClientRelationConflictError,
  createClientInDb,
  deleteClientInDb,
  getAllClientsFromDb,
  updateClientInDb,
} from "@/lib/repositories/clients";
import { z } from "zod";

const taxTypeSchema = z.object({
  name: z.string().min(1),
  frequency: z.enum(["MONTHLY", "ANNUAL", "ANNUAL_WORKFLOW"]),
  assignedStaffId: z.string().optional(),
});

const clientPayloadSchema = z.object({
  companyName: z.string().min(1),
  taxId: z.string().regex(/^\d{13}$/).optional(),
  businessType: z.string().min(1),
  filingMethod: z.enum(["PAPER", "E_FILING"]).optional(),
  fiscalYearStart: z.coerce.number().int().min(1).max(12).default(1),
  fiscalYearEnd: z.coerce.number().int().min(1).max(12).default(12),
  fiscalYearEndDay: z.coerce.number().int().min(1).max(31).optional(),
  teamId: z.string().optional(),
  assignedStaffId: z.string().optional(),
  taxTypes: z.array(taxTypeSchema).default([]),
});

const clientPatchSchema = clientPayloadSchema.partial().extend({
  id: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await getAllClientsFromDb();
  return NextResponse.json({ data: clients });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = clientPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลบริษัท/ห้างหุ้นส่วนฯไม่ถูกต้อง" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const fiscalYearEndDay =
    body.fiscalYearEndDay ??
    new Date(Date.UTC(2000, body.fiscalYearEnd, 0)).getUTCDate();

  const client = await createClientInDb({
    companyName: body.companyName,
    taxId: body.taxId,
    businessType: body.businessType,
    filingMethod: body.filingMethod,
    fiscalYearStart: body.fiscalYearStart,
    fiscalYearEnd: body.fiscalYearEnd,
    fiscalYearEndDay,
    teamId: body.teamId,
    assignedStaffId: body.assignedStaffId,
    taxTypes: body.taxTypes,
  });

  return NextResponse.json({ data: client }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = clientPatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลบริษัท/ห้างหุ้นส่วนฯไม่ถูกต้อง" }, { status: 400 });
  }
  const { id, ...data } = parsed.data;

  let updated;
  try {
    updated = await updateClientInDb(id, {
      ...data,
      isNonStandard:
        data.fiscalYearEnd !== undefined ? data.fiscalYearEnd !== 12 : undefined,
    });
  } catch (error) {
    if (error instanceof ClientRelationConflictError) {
      return NextResponse.json(
        { error: "ไม่สามารถลบประเภทภาษีที่มีงานอยู่ในระบบได้" },
        { status: 409 }
      );
    }
    throw error;
  }
  if (!updated) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const deleted = await deleteClientInDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถลบบริษัท/ห้างหุ้นส่วนฯที่มีงานอยู่ในระบบได้" },
      { status: 409 }
    );
  }

  return NextResponse.json({ message: "Deleted successfully" });
}
