import { NextRequest, NextResponse } from "next/server";
import { buildGenerationMessage, generateAllTasks } from "@/lib/taskGenerator";
import { isCronAuthorized } from "@/lib/cronNotify";

// One-off ops endpoint: backfill monthly tasks for every client that has no
// task history yet (e.g. a batch of new clients added mid-year). Reuses the
// same "no existing task" guard as the per-client UI action — clients with
// any existing task are left untouched. Remove once the 2026-08 backfill of
// newly onboarded clients is done; the per-client UI flow covers this going
// forward for individual clients.
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { searchParams } = new URL(req.url);

  if (typeof body.backfillFrom !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.backfillFrom)) {
    return NextResponse.json({ error: "backfillFrom ต้องอยู่ในรูปแบบ YYYY-MM-DD" }, { status: 400 });
  }
  const backfillFrom = new Date(body.backfillFrom + "T00:00:00.000Z");
  if (Number.isNaN(backfillFrom.getTime()) || backfillFrom >= new Date()) {
    return NextResponse.json({ error: "backfillFrom ต้องเป็นวันที่ในอดีต" }, { status: 400 });
  }

  const dryRun = searchParams.get("dryRun") === "true" || body.dryRun === true;

  const result = await generateAllTasks({
    dryRun,
    backfillFrom,
    triggeredBy: "manual-bulk-backfill",
  });

  return NextResponse.json({
    message: buildGenerationMessage(result),
    ...result,
  });
}
