"use client";

import { useRef, useState } from "react";
import { ExternalLink, Paperclip, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileNameOf, uploadFiles } from "@/lib/uploadFiles";
import { MAX_PAYMENT_FILES } from "@/lib/taskWorkflow";

/** Pick-and-upload list for slips / receipts. PDF, JPG, PNG up to 10 MB each (FR-87). */
export function PaymentFilesInput({
  value,
  onChange,
  label = "เลือกไฟล์",
  compact = false,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PAYMENT_FILES - value.length);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      onChange([...value, ...(await uploadFiles(files))]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        className="hidden"
        aria-label={label}
        onChange={handlePick}
      />
      {value.length < MAX_PAYMENT_FILES && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5 text-xs"
        >
          {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "กำลังอัปโหลด..." : label}
        </Button>
      )}
      {!compact && <p className="text-xs text-muted-foreground">PDF, JPG, PNG — ไม่เกิน 10 MB ต่อไฟล์</p>}
      {value.length > 0 && (
        <div className="flex flex-col gap-1">
          {value.map((url, i) => (
            <div key={`${url}-${i}`} className="flex items-center gap-2 text-xs">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline truncate max-w-[220px]"
              >
                <Paperclip className="h-3 w-3 flex-shrink-0" />
                {fileNameOf(url)}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="เอาไฟล์ออก"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Read-only list of attached files. */
export function FileLinks({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {urls.map((url, i) => (
        <a
          key={`${url}-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary underline truncate max-w-[240px]"
        >
          <Paperclip className="h-3 w-3 flex-shrink-0" />
          {fileNameOf(url)}
        </a>
      ))}
    </div>
  );
}

const isImage = (url: string) => /\.(png|jpe?g|webp)$/i.test(url.split("?")[0]);

/** QR / payment slip shown large enough to scan from the screen; PDFs as links. */
export function PaymentQrPreview({ urls }: { urls: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {urls.map((url, i) =>
        isImage(url) ? (
          <a key={`${url}-${i}`} href={url} target="_blank" rel="noopener noreferrer" title="เปิดภาพเต็ม">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`QR ${i + 1}`} className="h-40 w-40 object-contain rounded-md border bg-white" />
          </a>
        ) : (
          <FileLinks key={`${url}-${i}`} urls={[url]} />
        )
      )}
    </div>
  );
}
