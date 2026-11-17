import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { credentialGate } from "@/lib/credentialAccess";
import { createCredential, listCredentialsForClient } from "@/lib/repositories/credentials";

const createSchema = z.object({
  system: z.enum(["RD", "DBD", "SSO"]),
  username: z.string().trim().min(1, "กรุณาระบุชื่อผู้ใช้").max(200),
  password: z.string().min(1, "กรุณาระบุรหัสผ่าน").max(200),
  note: z.string().trim().max(500).nullish(),
});

/** List without passwords (NFR-10). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await credentialGate(await getServerSession(authOptions), params.id, false);
  if ("error" in gate) return gate.error;
  return NextResponse.json({ data: await listCredentialsForClient(gate.client), canEdit: gate.canEdit });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const gate = await credentialGate(session, params.id, true);
  if ("error" in gate) return gate.error;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  await createCredential(gate.client, parsed.data, session!.user.id);
  return NextResponse.json({ data: await listCredentialsForClient(gate.client) }, { status: 201 });
}
