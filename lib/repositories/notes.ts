import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { Note, NoteScope } from "@/types";

const noteInclude = {
  owner: { select: { name: true } },
  client: { select: { companyName: true } },
};

type NoteRow = {
  id: string;
  ownerId: string;
  scope: NoteScope;
  content: string;
  color: string;
  clientId: string | null;
  pinned: boolean;
  doneAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  owner: { name: string };
  client: { companyName: string } | null;
};

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    ownerId: row.ownerId,
    ownerName: row.owner.name,
    scope: row.scope,
    content: row.content,
    color: row.color,
    ...(row.clientId ? { clientId: row.clientId } : {}),
    ...(row.client ? { clientName: row.client.companyName } : {}),
    pinned: row.pinned,
    ...(row.doneAt ? { doneAt: row.doneAt.toISOString() } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Notes this user may see (own personal + every shared), pinned first, then latest edit (FR-96). */
export async function listNotesForUser(userId: string, filters: { clientId?: string } = {}): Promise<Note[]> {
  const rows = await prisma.note.findMany({
    where: {
      OR: [{ scope: "SHARED" }, { ownerId: userId }],
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
    },
    include: noteInclude,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(toNote);
}

export async function getNoteRowFromDb(id: string) {
  return prisma.note.findUnique({ where: { id }, select: { id: true, ownerId: true, scope: true } });
}

/** Note counts per company visible to this user (for the companies page). */
export async function countNotesByClientForUser(userId: string): Promise<Record<string, number>> {
  const groups = await prisma.note.groupBy({
    by: ["clientId"],
    where: { clientId: { not: null }, doneAt: null, OR: [{ scope: "SHARED" }, { ownerId: userId }] },
    _count: { _all: true },
  });
  return Object.fromEntries(groups.map((g) => [g.clientId as string, g._count._all]));
}

export async function createNoteInDb(input: {
  ownerId: string;
  scope: NoteScope;
  content: string;
  color: string;
  clientId?: string | null;
}): Promise<Note> {
  const row = await prisma.note.create({
    data: {
      id: randomUUID(),
      ownerId: input.ownerId,
      scope: input.scope,
      content: input.content,
      color: input.color,
      clientId: input.clientId || null,
    },
    include: noteInclude,
  });
  return toNote(row);
}

export async function updateNoteInDb(
  id: string,
  input: Partial<{ scope: NoteScope; content: string; color: string; clientId: string | null; pinned: boolean; done: boolean }>
): Promise<Note> {
  const row = await prisma.note.update({
    where: { id },
    data: {
      scope: input.scope,
      content: input.content,
      color: input.color,
      clientId: input.clientId === undefined ? undefined : input.clientId || null,
      pinned: input.pinned,
      doneAt: input.done === undefined ? undefined : input.done ? new Date() : null,
    },
    include: noteInclude,
  });
  return toNote(row);
}

export async function deleteNoteFromDb(id: string): Promise<void> {
  await prisma.note.delete({ where: { id } });
}
