import { NotesBoard } from "@/components/notes/NotesBoard";

/** Quick Note (customer feedback): the shared/personal note board as its own menu. */
export default function QuickNotePage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Quick Note</h2>
        <p className="text-sm text-muted-foreground mt-1">
          จดงานฝากหรือกันลืม — เลือกได้ว่าเห็นคนเดียวหรือให้ทุกคนเห็น
        </p>
      </div>
      <NotesBoard />
    </div>
  );
}
