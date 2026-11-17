import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { canEditClientWithScope } from "@/lib/clientAccess";
import { getClientByIdFromDb } from "@/lib/repositories/clients";
import { getLedTeamScope } from "@/lib/repositories/tasks";

/**
 * Shared checks for the government-credential APIs.
 * - Only sessions that passed 2FA (FR-109).
 * - Everyone may view/copy every company's credentials (customer answer 10, replacing FR-73).
 * - Adding, changing, deleting: supervisors, the company's responsible person, their team lead.
 */
export async function credentialGate(session: Session | null, clientId: string, needEdit: boolean) {
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.mfa !== "ok") {
    return { error: NextResponse.json({ error: "ต้องยืนยันตัวตนสองชั้นก่อน" }, { status: 403 }) };
  }
  const client = await getClientByIdFromDb(clientId);
  if (!client) return { error: NextResponse.json({ error: "Client not found" }, { status: 404 }) };
  const canEdit = canEditClientWithScope(session.user, client, await getLedTeamScope(session.user.id));
  if (needEdit && !canEdit) {
    return { error: NextResponse.json({ error: "แก้ไขรหัสได้เฉพาะผู้จัดการ ผู้รับผิดชอบบริษัท หรือหัวหน้าทีม" }, { status: 403 }) };
  }
  return { client, canEdit };
}
