"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type RowError = { rowNumber: number; companyName: string; messages: string[] };
type Preview = { valid: { rowNumber: number; companyName: string; branchCode: string }[]; errors: RowError[] };

/** FR-106: download template → upload → see what is wrong → save only the good rows. */
export function ImportClientsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function send(f: File, commit: boolean) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", f);
      const res = await fetch(`/api/clients/import${commit ? "?commit=1" : ""}`, { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "นำเข้าไม่สำเร็จ");
        return;
      }
      if (!commit) {
        setPreview(json.data);
        return;
      }
      toast.success(`นำเข้า ${json.data.created} บริษัท · สร้างงาน ${json.data.tasks} งาน`);
      if (json.data.errors.length) toast.warning(`ข้าม ${json.data.errors.length} แถวที่ไม่ถูกต้อง`);
      reset();
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            นำเข้าบริษัทจาก Excel
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <ol className="space-y-1 text-muted-foreground list-decimal pl-5">
            <li>ดาวน์โหลดแม่แบบ แล้วกรอกแถวละ 1 บริษัท/สาขา (ดูค่าที่ใช้ได้ในแผ่นที่ 2)</li>
            <li>เลือกไฟล์ ระบบจะตรวจและบอกแถวที่ผิดพร้อมเหตุผล</li>
            <li>กดนำเข้า — บันทึกเฉพาะแถวที่ถูกต้อง และสร้างงานให้อัตโนมัติ</li>
          </ol>
          <p className="text-xs text-muted-foreground">ไม่นำเข้ารหัสผ่านหน่วยงานรัฐจากไฟล์ — กรอกในหน้าบริษัทแทน</p>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href="/api/clients/import/template">
                <Download className="h-4 w-4" />
                ดาวน์โหลดแม่แบบ
              </a>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              aria-label="เลือกไฟล์ Excel"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFile(f);
                setPreview(null);
                send(f, false);
              }}
            />
            <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {file ? "เลือกไฟล์ใหม่" : "เลือกไฟล์"}
            </Button>
            {file && <span className="text-xs text-muted-foreground self-center truncate max-w-[180px]">{file.name}</span>}
          </div>

          {busy && <p className="text-xs text-muted-foreground">กำลังตรวจ...</p>}

          {preview && (
            <div className="space-y-2">
              <p>
                ถูกต้อง <b>{preview.valid.length}</b> แถว · ผิด <b className={preview.errors.length ? "text-red-600" : ""}>{preview.errors.length}</b> แถว
              </p>
              {preview.errors.length > 0 && (
                <div className="rounded-md border border-red-200 dark:border-red-900 divide-y max-h-60 overflow-y-auto">
                  {preview.errors.map((e) => (
                    <div key={e.rowNumber} className="px-3 py-2">
                      <p className="text-xs font-medium">แถว {e.rowNumber}: {e.companyName || "(ไม่มีชื่อ)"}</p>
                      <ul className="text-xs text-red-700 dark:text-red-400 list-disc pl-4">
                        {e.messages.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => { reset(); onClose(); }}>ยกเลิก</Button>
                <Button size="sm" disabled={busy || preview.valid.length === 0 || !file} onClick={() => file && send(file, true)}>
                  นำเข้า {preview.valid.length} รายการ
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
