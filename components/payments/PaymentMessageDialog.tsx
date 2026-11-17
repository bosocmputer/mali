"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildPaymentMessage, type PaymentMessageInput } from "@/lib/paymentMessage";

/**
 * Answer 16 / FR-100: the month's payment message for one company. Fee and payment date are
 * prefilled and editable; the text is regenerated from them until the user edits it by hand.
 * MALI never sends it — the user copies it into the client's LINE group.
 */
export function PaymentMessageDialog({
  clientId,
  period,
  open,
  onClose,
}: {
  clientId: string;
  /** YYYY-MM */
  period: string;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<PaymentMessageInput | null>(null);
  const [month, setMonth] = useState(period);
  const [fee, setFee] = useState("");
  const [due, setDue] = useState("");
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMonth(period), [period]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    setEdited(false);
    fetch(`/api/clients/${clientId}/payment-message?period=${month}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) return setError(j.error ?? "โหลดไม่สำเร็จ");
        setData(j.data);
        setFee(j.data.fee !== undefined && j.data.fee !== null ? String(j.data.fee) : "");
        setDue(j.data.dueDate ?? "");
      })
      .catch(() => setError("ไม่สามารถเชื่อมต่อได้"));
  }, [open, clientId, month]);

  const generated = useMemo(() => {
    if (!data) return "";
    const feeNumber = fee.trim() === "" ? undefined : Number(fee.replace(/,/g, ""));
    return buildPaymentMessage({
      ...data,
      fee: feeNumber !== undefined && !Number.isNaN(feeNumber) ? feeNumber : undefined,
      dueDate: due || undefined,
    });
  }, [data, fee, due]);

  useEffect(() => {
    if (!edited) setText(generated);
  }, [generated, edited]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("คัดลอกข้อความแล้ว — วางในกลุ่ม LINE ของลูกค้าได้เลย");
    } catch {
      toast.error("คัดลอกไม่ได้ในเบราว์เซอร์นี้ — เลือกข้อความแล้วกด Ctrl+C แทน");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="h-4 w-4 text-primary" />
            ข้อความแจ้งยอด {data ? `· ${data.companyLabel}` : ""}
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">งวดเดือน</Label>
                <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ค่าบริการ (บาท)</Label>
                <Input inputMode="decimal" value={fee} placeholder="ไม่ใส่" onChange={(e) => { setFee(e.target.value); setEdited(false); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">กำหนดชำระ</Label>
                <Input type="date" value={due} onChange={(e) => { setDue(e.target.value); setEdited(false); }} />
              </div>
            </div>
            {data.items.length === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">ไม่มีงานที่มีการชำระในงวดนี้</p>
            )}
            <Textarea
              rows={16}
              value={text}
              onChange={(e) => { setText(e.target.value); setEdited(true); }}
              className="font-mono text-xs"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {edited ? "แก้ข้อความเองแล้ว — เปลี่ยนค่าบริการหรือวันที่เพื่อสร้างใหม่" : "แก้ข้อความได้ก่อนคัดลอก"}
              </p>
              <Button size="sm" className="gap-1.5" onClick={copy} disabled={!text}>
                <Copy className="h-4 w-4" />
                คัดลอกข้อความ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
