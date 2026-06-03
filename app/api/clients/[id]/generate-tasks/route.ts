import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildGenerationMessage, generateTasksForClient } from "@/lib/taskGenerator";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { searchParams } = new URL(req.url);
  const result = await generateTasksForClient(params.id, {
    defaultAssignedUserId: body.assignedUserId,
    dryRun: searchParams.get("dryRun") === "true" || body.dryRun === true,
    triggeredBy: session.user.id,
  });

  if (result.wouldCreate === 0 && result.skipped === 0 && result.errors.length > 0) {
    return NextResponse.json({ error: result.errors[0] }, { status: 404 });
  }

  return NextResponse.json({
    message: buildGenerationMessage(result),
    ...result,
  });
}
