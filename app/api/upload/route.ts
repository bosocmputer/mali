import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์ในคำขอ" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "รองรับเฉพาะไฟล์ PDF, JPG, PNG, WebP เท่านั้น" },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ขนาดไฟล์ต้องไม่เกิน 10 MB" },
      { status: 413 }
    );
  }

  // Keep the original name so people see "สลิป.jpg", not an id: <user>-<timestamp>-<name>.
  // Anything other than English/Thai letters, digits, _ and - (incl. "/" and "..") becomes "_".
  const original = file.name.normalize("NFC");
  const ext = (original.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const base = original.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_\-\u0E00-\u0E7F]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "file";
  const filename = `${session.user.id}-${Date.now()}-${base}.${ext}`;

  // Production: use Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`evidence/${filename}`, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  }

  // Local/self-hosted fallback: save to public/uploads/, serve via /api/uploads/
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
  const url = `/api/uploads/${encodeURIComponent(filename)}`;
  return NextResponse.json({ url }, { status: 201 });
}
