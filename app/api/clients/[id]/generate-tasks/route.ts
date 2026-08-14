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

  let backfillFrom: Date | undefined;
  if (typeof body.backfillFrom === "string" && body.backfillFrom) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.backfillFrom)) {
      return NextResponse.json({ error: "backfillFrom ต้องอยู่ในรูปแบบ YYYY-MM-DD" }, { status: 400 });
    }
    const parsed = new Date(body.backfillFrom + "T00:00:00.000Z");
    if (Number.isNaN(parsed.getTime()) || parsed >= new Date()) {
      return NextResponse.json({ error: "backfillFrom ต้องเป็นวันที่ในอดีต" }, { status: 400 });
    }
    backfillFrom = parsed;
  }

  const result = await generateTasksForClient(params.id, {
    defaultAssignedUserId: body.assignedUserId,
    dryRun: searchParams.get("dryRun") === "true" || body.dryRun === true,
    triggeredBy: session.user.id,
    backfillFrom,
  });

  // สร้างไม่ได้เลยและมี error → 422 พร้อม errors ทั้งหมด
  if (result.created === 0 && result.wouldCreate === 0 && result.errors.length > 0) {
    return NextResponse.json(
      { error: result.errors.join("\n"), errors: result.errors },
      { status: 422 }
    );
  }

  return NextResponse.json({
    message: buildGenerationMessage(result),
    ...result,
  });
}
