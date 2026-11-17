"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, ChevronDown, ChevronUp, Pencil, Pin, PinOff, Plus, StickyNote, Trash2, Undo2, Users, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canDeleteNote, canEditNote, NOTE_COLORS, NOTE_MAX_LENGTH, type NoteColor } from "@/lib/noteAccess";
import { cn } from "@/lib/utils";
import type { Note, NoteScope } from "@/types";

const COLOR_CLASS: Record<NoteColor, string> = {
  yellow: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900",
  green: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
  blue: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900",
  pink: "bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900",
  purple: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900",
};
const DOT_CLASS: Record<NoteColor, string> = {
  yellow: "bg-yellow-300",
  green: "bg-emerald-300",
  blue: "bg-sky-300",
  pink: "bg-pink-300",
  purple: "bg-violet-300",
};
const colorOf = (c: string): NoteColor => (NOTE_COLORS as readonly string[]).includes(c) ? (c as NoteColor) : "yellow";

type Draft = { id?: string; content: string; color: NoteColor; scope: NoteScope; clientId: string };
const emptyDraft = (scope: NoteScope): Draft => ({ content: "", color: "yellow", scope, clientId: "" });

/**
 * Post-it board (FR-93–97). Two tabs: my personal notes and the shared board everyone sees.
 * Pinned first, then most recently edited; finished notes are tucked away but can be reopened.
 * With `clientId` it shows only notes tied to that company (companies page).
 */
export function NotesBoard({ clientId, compact = false }: { clientId?: string; compact?: boolean }) {
  const { data: session } = useSession();
  const me = session?.user ? { id: session.user.id, role: session.user.role } : null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [tab, setTab] = useState<NoteScope>(clientId ? "SHARED" : "PERSONAL");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/notes${clientId ? `?clientId=${clientId}` : ""}`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setNotes(json.data ?? []);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!draft || clientId || clients.length) return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((json) =>
        setClients(
          (json.data ?? [])
            .filter((c: { isActive?: boolean }) => c.isActive !== false)
            .map((c: { id: string; companyName: string }) => ({ id: c.id, companyName: c.companyName }))
        )
      )
      .catch(() => {});
  }, [draft, clientId, clients.length]);

  const visible = clientId ? notes : notes.filter((n) => n.scope === tab);
  const open = visible.filter((n) => !n.doneAt);
  const done = visible.filter((n) => n.doneAt);

  async function call(url: string, method: string, body?: unknown, ok?: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "บันทึกไม่สำเร็จ");
        return false;
      }
      if (ok) toast.success(ok);
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    const body = {
      content: draft.content,
      color: draft.color,
      scope: draft.scope,
      clientId: clientId ?? (draft.clientId || null),
    };
    const saved = draft.id
      ? await call(`/api/notes/${draft.id}`, "PATCH", body)
      : await call("/api/notes", "POST", body, "เพิ่มโน้ตแล้ว");
    if (saved) {
      setTab(draft.scope);
      setDraft(null);
    }
  }

  function NoteCard({ note }: { note: Note }) {
    const mine = !!me && canEditNote(me, note);
    const deletable = !!me && canDeleteNote(me, note);
    return (
      <div className={cn("rounded-lg border p-3 flex flex-col gap-2 min-h-[110px]", COLOR_CLASS[colorOf(note.color)], note.doneAt && "opacity-60")}>
        <div className="flex items-start gap-2">
          {note.pinned && <Pin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />}
          <p className={cn("text-sm whitespace-pre-wrap break-words flex-1", note.doneAt && "line-through")}>{note.content}</p>
        </div>
        {note.clientName && !clientId && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Building2 className="h-3 w-3" />
            {note.clientName}
          </span>
        )}
        <div className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          {clientId && (note.scope === "SHARED" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />)}
          <span className="truncate">
            {note.ownerName} · {new Date(note.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}
          </span>
          <span className="ml-auto flex items-center">
            {mine && (
              <>
                <IconButton title={note.pinned ? "เลิกปักหมุด" : "ปักหมุด"} onClick={() => call(`/api/notes/${note.id}`, "PATCH", { pinned: !note.pinned })}>
                  {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </IconButton>
                <IconButton title={note.doneAt ? "ยังไม่เสร็จ" : "เสร็จแล้ว"} onClick={() => call(`/api/notes/${note.id}`, "PATCH", { done: !note.doneAt })}>
                  {note.doneAt ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                </IconButton>
                <IconButton
                  title="แก้ไข"
                  onClick={() =>
                    setDraft({ id: note.id, content: note.content, color: colorOf(note.color), scope: note.scope, clientId: note.clientId ?? "" })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
              </>
            )}
            {deletable && (
              <IconButton
                title="ลบ"
                onClick={() => {
                  if (window.confirm("ลบโน้ตนี้?")) call(`/api/notes/${note.id}`, "DELETE", undefined, "ลบโน้ตแล้ว");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-5")}>
        <div className="flex items-center gap-2 flex-wrap">
          <StickyNote className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{clientId ? "โน้ตของบริษัทนี้" : "โน้ต"}</h3>
          {!clientId && (
            <div className="flex rounded-md border overflow-hidden text-xs ml-2">
              {(["PERSONAL", "SHARED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTab(s)}
                  className={cn("px-3 py-1", tab === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {s === "PERSONAL" ? "โน้ตของฉัน" : "โน้ตรวม"} ({notes.filter((n) => n.scope === s && !n.doneAt).length})
                </button>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" className="ml-auto gap-1 h-7 text-xs" onClick={() => setDraft(emptyDraft(clientId ? "SHARED" : tab))}>
            <Plus className="h-3.5 w-3.5" />
            เพิ่มโน้ต
          </Button>
        </div>

        {draft && (
          <div className={cn("rounded-lg border p-3 space-y-2", COLOR_CLASS[draft.color])}>
            <Textarea
              autoFocus
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="พิมพ์ข้อความ..."
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              className="bg-background/60 text-sm resize-none"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`สี ${c}`}
                    onClick={() => setDraft({ ...draft, color: c })}
                    className={cn("h-5 w-5 rounded-full border", DOT_CLASS[c], draft.color === c && "ring-2 ring-offset-1 ring-primary")}
                  />
                ))}
              </div>
              <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as NoteScope })}>
                <SelectTrigger className="h-7 w-auto text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">เห็นเฉพาะฉัน</SelectItem>
                  <SelectItem value="SHARED">ทุกคนเห็น</SelectItem>
                </SelectContent>
              </Select>
              {!clientId && (
                <Select value={draft.clientId || "_none"} onValueChange={(v) => setDraft({ ...draft, clientId: v === "_none" ? "" : v })}>
                  <SelectTrigger className="h-7 w-auto max-w-[220px] text-xs"><SelectValue placeholder="ไม่ผูกบริษัท" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">ไม่ผูกบริษัท</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <span className="text-[11px] text-muted-foreground ml-auto">{draft.content.length}/{NOTE_MAX_LENGTH}</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDraft(null)} disabled={busy}>ยกเลิก</Button>
              <Button size="sm" className="h-7 text-xs" onClick={saveDraft} disabled={busy || !draft.content.trim()}>บันทึก</Button>
            </div>
          </div>
        )}

        {open.length === 0 && !draft ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {clientId ? "ยังไม่มีโน้ตของบริษัทนี้" : tab === "PERSONAL" ? "ยังไม่มีโน้ตของคุณ" : "ยังไม่มีโน้ตรวม"}
          </p>
        ) : (
          <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
            {open.map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        )}

        {done.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowDone((v) => !v)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {showDone ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              เสร็จแล้ว ({done.length})
            </button>
            {showDone && (
              <div className={cn("grid gap-2 mt-2", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
                {done.map((n) => <NoteCard key={n.id} note={n} />)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="p-1 rounded hover:bg-background/70 hover:text-foreground">
      {children}
    </button>
  );
}
