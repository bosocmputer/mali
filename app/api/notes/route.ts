import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createNoteInDb, listNotesForUser } from "@/lib/repositories/notes";
import { NOTE_COLORS, NOTE_MAX_LENGTH } from "@/lib/noteAccess";

const noteFieldsSchema = z.object({
  scope: z.enum(["PERSONAL", "SHARED"]),
  content: z.string().trim().min(1, "กรุณาพิมพ์ข้อความ").max(NOTE_MAX_LENGTH, `ข้อความยาวได้ไม่เกิน ${NOTE_MAX_LENGTH} ตัวอักษร`),
  color: z.enum(NOTE_COLORS).default("yellow"),
  clientId: z.string().min(1).nullish(),
});

/** Own personal notes + all shared notes (personal notes of others are filtered in the query). */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = new URL(req.url).searchParams.get("clientId") ?? undefined;
  return NextResponse.json({ data: await listNotesForUser(session.user.id, { clientId }) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = noteFieldsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const note = await createNoteInDb({ ownerId: session.user.id, ...parsed.data });
  return NextResponse.json({ data: note }, { status: 201 });
}
