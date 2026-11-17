import { describe, expect, it } from "vitest";
import { canDeleteNote, canEditNote, canSeeNote } from "./noteAccess";

const owner = { id: "a", role: "STAFF" };
const other = { id: "b", role: "STAFF" };
const sup = { id: "s", role: "SUPERVISOR" };

describe("note access", () => {
  it("personal notes are private, even from supervisors", () => {
    const note = { ownerId: "a", scope: "PERSONAL" as const };
    expect(canSeeNote(owner, note)).toBe(true);
    expect(canSeeNote(other, note)).toBe(false);
    expect(canSeeNote(sup, note)).toBe(false);
    expect(canDeleteNote(sup, note)).toBe(false);
  });

  it("shared notes are read by all, edited by the owner, deleted by owner or supervisor", () => {
    const note = { ownerId: "a", scope: "SHARED" as const };
    expect(canSeeNote(other, note)).toBe(true);
    expect(canEditNote(other, note)).toBe(false);
    expect(canEditNote(sup, note)).toBe(false);
    expect(canDeleteNote(other, note)).toBe(false);
    expect(canDeleteNote(sup, note)).toBe(true);
    expect(canDeleteNote(owner, note)).toBe(true);
  });
});
