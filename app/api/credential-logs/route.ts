import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listCredentialLogs } from "@/lib/repositories/credentials";

/** FR-74: supervisors read who viewed, copied or changed government-site passwords. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const search = new URL(req.url).searchParams.get("search") ?? undefined;
  return NextResponse.json({ data: await listCredentialLogs({ search }) });
}
