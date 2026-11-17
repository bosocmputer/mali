import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { credentialGate } from "@/lib/credentialAccess";
import {
  deleteCredential,
  findCredentialForClient,
  listCredentialsForClient,
  updateCredential,
} from "@/lib/repositories/credentials";

const patchSchema = z.object({
  username: z.string().trim().min(1).max(200).optional(),
  // empty / missing = keep the current password
  password: z.string().max(200).optional(),
  note: z.string().trim().max(500).nullish(),
});

type Params = { params: { id: string; credentialId: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const gate = await credentialGate(session, params.id, true);
  if ("error" in gate) return gate.error;
  if (!(await findCredentialForClient(params.credentialId, gate.client))) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  await updateCredential(params.credentialId, gate.client, parsed.data, session!.user.id);
  return NextResponse.json({ data: await listCredentialsForClient(gate.client) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const gate = await credentialGate(session, params.id, true);
  if ("error" in gate) return gate.error;
  if (!(await findCredentialForClient(params.credentialId, gate.client))) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }
  await deleteCredential(params.credentialId, gate.client, session!.user.id);
  return NextResponse.json({ data: await listCredentialsForClient(gate.client) });
}
