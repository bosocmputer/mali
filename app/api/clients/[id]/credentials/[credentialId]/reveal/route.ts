import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { credentialGate } from "@/lib/credentialAccess";
import { findCredentialForClient, revealPassword } from "@/lib/repositories/credentials";

/**
 * FR-72/74, NFR-10: one password, on request, for one credential — logged as VIEW or COPY.
 * POST so it is never cached or prefetched.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string; credentialId: string } }) {
  const session = await getServerSession(authOptions);
  const gate = await credentialGate(session, params.id, false);
  if ("error" in gate) return gate.error;
  if (!(await findCredentialForClient(params.credentialId, gate.client))) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action === "COPY" ? "COPY" : "VIEW";
  const password = await revealPassword(params.credentialId, gate.client, session!.user.id, action);
  return NextResponse.json({ data: { password } }, { headers: { "Cache-Control": "no-store" } });
}
