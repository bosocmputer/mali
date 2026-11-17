import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ClientRelationConflictError,
  createClientInDb,
  deleteClientInDb,
  findClientByTaxId,
  getAllClientsFromDb,
  getClientByIdFromDb,
  updateClientInDb,
} from "@/lib/repositories/clients";
import { getLedTeamScope } from "@/lib/repositories/tasks";
import { canEditClientWithScope } from "@/lib/clientAccess";
import { buildGenerationMessage, generateTasksForClient } from "@/lib/taskGenerator";
import { notifyClientAddedByStaff } from "@/lib/workflowNotify";
import { clientLabel } from "@/lib/clientLabel";
import { z } from "zod";

const taxTypeSchema = z.object({
  name: z.string().min(1),
  frequency: z.enum(["MONTHLY", "ANNUAL", "ANNUAL_WORKFLOW"]),
  defaultPaymentType: z.enum(["CLIENT_PAYS", "OFFICE_PAYS", "NO_ADDITIONAL", "NO_TAX"]).optional(),
  assignedStaffId: z.string().nullish(),
});

const clientPayloadSchema = z.object({
  companyName: z.string().min(1),
  taxId: z.string().regex(/^\d{13}$/).optional(),
  // 5 digits as on the RD forms; 00000 = head office
  branchCode: z.string().regex(/^\d{5}$/, "รหัสสาขาต้องเป็นตัวเลข 5 หลัก").default("00000"),
  branchName: z.string().trim().max(100).nullish(),
  businessType: z.string().min(1),
  filingMethod: z.enum(["PAPER", "E_FILING"]).optional(),
  fiscalYearStart: z.coerce.number().int().min(1).max(12).default(1),
  fiscalYearEnd: z.coerce.number().int().min(1).max(12).default(12),
  fiscalYearEndDay: z.coerce.number().int().min(1).max(31).optional(),
  teamId: z.string().optional(),
  // null = ผู้ใช้ตั้งใจล้างผู้รับผิดชอบออก, undefined = ไม่ได้แก้ฟิลด์นี้ —
  // ต้องแยกสองกรณีนี้เพื่อให้ updateClientInDb รู้ว่าต้องบันทึกประวัติ/reassign ไหม
  assignedStaffId: z.string().nullish(),
  auditorName: z.string().trim().max(200).nullish(),
  taxTypes: z.array(taxTypeSchema).default([]),
});

const clientPatchSchema = clientPayloadSchema.partial().extend({
  id: z.string().min(1),
  // No default here: a PATCH without taxTypes must leave them alone (the create schema's
  // default([]) would otherwise read as "remove every tax type")
  taxTypes: z.array(taxTypeSchema).optional(),
  branchCode: z.string().regex(/^\d{5}$/, "รหัสสาขาต้องเป็นตัวเลข 5 หลัก").optional(),
  // FR-105, supervisor only
  isActive: z.boolean().optional(),
  serviceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

async function duplicateTaxIdResponse(taxId: string | undefined, branchCode: string, excludeId?: string) {
  if (!taxId) return null;
  const existing = await findClientByTaxId(taxId, branchCode, excludeId);
  if (!existing) return null;
  return NextResponse.json(
    {
      error: `เลขนิติบุคคลและรหัสสาขานี้มีอยู่แล้ว: ${existing.label} (ผู้รับผิดชอบ: ${existing.assignedStaffName ?? "ยังไม่ระบุ"}) — ถ้าเป็นสาขาอื่น ให้ใส่รหัสสาขาให้ถูกต้อง`,
      code: "DUPLICATE_TAX_ID",
    },
    { status: 409 }
  );
}

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await getAllClientsFromDb();
  return NextResponse.json({ data: clients });
}

/** FR-66–69: supervisors and staff add companies; tasks are generated right away. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isSupervisor = session.user.role === "SUPERVISOR";

  const parsed = clientPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลบริษัท/ห้างหุ้นส่วนฯไม่ถูกต้อง" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const duplicate = await duplicateTaxIdResponse(body.taxId, body.branchCode);
  if (duplicate) return duplicate;

  const fiscalYearEndDay =
    body.fiscalYearEndDay ??
    new Date(Date.UTC(2000, body.fiscalYearEnd, 0)).getUTCDate();

  let client;
  try {
    client = await createClientInDb({
      companyName: body.companyName,
      taxId: body.taxId,
      branchCode: body.branchCode,
      branchName: body.branchName ?? undefined,
      businessType: body.businessType,
      filingMethod: body.filingMethod,
      fiscalYearStart: body.fiscalYearStart,
      fiscalYearEnd: body.fiscalYearEnd,
      fiscalYearEndDay,
      // Staff become the responsible person of what they add (FR-67); assignments are the supervisor's
      teamId: isSupervisor ? body.teamId : undefined,
      assignedStaffId: isSupervisor ? body.assignedStaffId ?? undefined : session.user.id,
      auditorName: body.auditorName ?? undefined,
      createdById: session.user.id,
      taxTypes: body.taxTypes.map((taxType) => ({
        ...taxType,
        assignedStaffId: isSupervisor ? taxType.assignedStaffId ?? undefined : undefined,
      })),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return (await duplicateTaxIdResponse(body.taxId, body.branchCode)) ?? NextResponse.json({ error: "ข้อมูลซ้ำ" }, { status: 409 });
    }
    throw error;
  }

  // FR-67: create this company's tasks now, as the daily run would
  let generation: { message: string; created: number; errors: string[] } | null = null;
  try {
    const result = await generateTasksForClient(client.id, { triggeredBy: session.user.id });
    generation = { message: buildGenerationMessage(result), created: result.created, errors: result.errors };
  } catch (error) {
    generation = { message: "สร้างงานอัตโนมัติไม่สำเร็จ", created: 0, errors: [String(error)] };
  }

  if (!isSupervisor) {
    await notifyClientAddedByStaff(clientLabel(client), session.user.name ?? "เจ้าหน้าที่");
  }

  return NextResponse.json({ data: client, generation }, { status: 201 });
}

/**
 * Supervisors edit any company. Staff edit the companies they are responsible for, team leads also
 * their team's (FR-70, customer answer 10) — but not assignments, team, or activation.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isSupervisor = session.user.role === "SUPERVISOR";

  const parsed = clientPatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลบริษัท/ห้างหุ้นส่วนฯไม่ถูกต้อง" }, { status: 400 });
  }
  const { id, ...data } = parsed.data;

  const current = await getClientByIdFromDb(id);
  if (!current) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (!isSupervisor && !canEditClientWithScope(session.user, current, await getLedTeamScope(session.user.id))) {
    return NextResponse.json({ error: "แก้ไขได้เฉพาะบริษัทที่คุณรับผิดชอบ" }, { status: 403 });
  }
  if (!isSupervisor) {
    delete data.assignedStaffId;
    delete data.teamId;
    delete data.isActive;
    delete data.serviceEndDate;
  }

  // taxId / branch may change separately — check the combination they will end up as
  const nextTaxId = data.taxId ?? current.taxId;
  const nextBranch = data.branchCode ?? current.branchCode;
  const duplicate =
    data.taxId !== undefined || data.branchCode !== undefined
      ? await duplicateTaxIdResponse(nextTaxId, nextBranch, id)
      : null;
  if (duplicate) return duplicate;

  let updated;
  try {
    updated = await updateClientInDb(
      id,
      {
        ...data,
        isNonStandard:
          data.fiscalYearEnd !== undefined ? data.fiscalYearEnd !== 12 : undefined,
      },
      session.user.id,
      { keepAssignments: !isSupervisor }
    );
  } catch (error) {
    if (error instanceof ClientRelationConflictError) {
      return NextResponse.json(
        { error: "ไม่สามารถลบประเภทภาษีที่มีงานอยู่ในระบบได้" },
        { status: 409 }
      );
    }
    if (isUniqueViolation(error)) {
      return (await duplicateTaxIdResponse(nextTaxId, nextBranch, id)) ?? NextResponse.json({ error: "ข้อมูลซ้ำ" }, { status: 409 });
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
