import { NextRequest, NextResponse } from "next/server";
import { buildGenerationMessage, generateAllTasks } from "@/lib/taskGenerator";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

function isAuthorized(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  // Local dev: x-cron-secret header
  const xHeader = req.headers.get("x-cron-secret");
  if (xHeader === CRON_SECRET) return true;
  // Vercel cron: Authorization: Bearer <secret>
  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${CRON_SECRET}`) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "true";
  const result = await generateAllTasks({
    dryRun,
    triggeredBy: "cron",
  });

  return NextResponse.json({
    message: buildGenerationMessage(result),
    ...result,
  });
}
