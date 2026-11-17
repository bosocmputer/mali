import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUserAccessTask } from "@/lib/repositories/tasks";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const MIME_TYPES: Record<string, string> = {
  pdf:  "application/pdf",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
};

/**
 * Who may open an uploaded file (FR-87): supervisors; the person who uploaded it (filenames start
 * with the uploader's id — needed before the file is saved on a task); anyone who can open a task
 * the file is attached to. Before Update 2 any URL holder could open evidence without logging in.
 */
async function canOpenFile(user: { id: string; role: string }, url: string, filename: string) {
  if (user.role === "SUPERVISOR" || filename.startsWith(`${user.id}-`)) return true;
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { evidenceUrls: { has: url } },
        { clientSlipUrls: { has: url } },
        { receiptUrls: { has: url } },
        { paymentQrUrls: { has: url } },
      ],
    },
    select: { assignedUserId: true, client: { select: { teamId: true } } },
  });
  for (const task of tasks) {
    if (await canUserAccessTask(user, task)) return true;
  }
  return false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const filename = params.path.join("/");
  // Stored URLs are percent-encoded (Thai file names); params arrive decoded
  const storedUrl = `/api/uploads/${params.path.map(encodeURIComponent).join("/")}`;
  if (!(await canOpenFile(session.user, storedUrl, filename))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Prevent path traversal
  const resolved = path.resolve(UPLOAD_DIR, filename);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep) && resolved !== UPLOAD_DIR) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(resolved);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!stat.isFile()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  const nodeStream = createReadStream(resolved);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
