import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { deleteNoteFromDb, getNoteRowFromDb, updateNoteInDb } from "@/lib/repositories/notes";
import { canDeleteNote, canEditNote, canSeeNote, NOTE_COLORS, NOTE_MAX_LENGTH } from "@/lib/noteAccess";

const patchSchema = z.object({
  scope: z.enum(["PERSONAL", "SHARED"]).optional(),
  content: z.string().trim().min(1, "กรุณาพิมพ์ข้อความ").max(NOTE_MAX_LENGTH, `ข้อความยาวได้ไม่เกิน ${NOTE_MAX_LENGTH} ตัวอักษร`).optional(),
  color: z.enum(NOTE_COLORS).optional(),
  clientId: z.string().min(1).nullish(),
  pinned: z.boolean().optional(),
  done: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const note = await getNoteRowFromDb(params.id);
  // A personal note of someone else looks the same as a missing one
  if (!note || !canSeeNote(session.user, note)) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (!canEditNote(session.user, note)) {
    return NextResponse.json({ error: "แก้ไขได้เฉพาะโน้ตของตัวเอง" }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  return NextResponse.json({ data: await updateNoteInDb(params.id, parsed.data) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const note = await getNoteRowFromDb(params.id);
  if (!note || !canSeeNote(session.user, note)) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (!canDeleteNote(session.user, note)) {
    return NextResponse.json({ error: "ลบได้เฉพาะโน้ตของตัวเอง" }, { status: 403 });
  }
  await deleteNoteFromDb(params.id);
  return NextResponse.json({ data: { id: params.id } });
}
