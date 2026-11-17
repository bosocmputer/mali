import type { NoteScope } from "@/types";

export const NOTE_MAX_LENGTH = 500;
export const NOTE_COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

type Actor = { id: string; role: string };
type NoteRef = { ownerId: string; scope: NoteScope };

/** FR-93: personal notes are seen only by their owner; shared notes by everyone. */
export const canSeeNote = (user: Actor, note: NoteRef) => note.scope === "SHARED" || note.ownerId === user.id;

/** FR-95: only the owner edits (text, colour, company, type, pin, done). */
export const canEditNote = (user: Actor, note: NoteRef) => note.ownerId === user.id;

/** FR-95: the owner deletes; supervisors may also delete any shared note. */
export const canDeleteNote = (user: Actor, note: NoteRef) =>
  note.ownerId === user.id || (note.scope === "SHARED" && user.role === "SUPERVISOR");
