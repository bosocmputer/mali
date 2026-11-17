"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "payment.accountName", label: "ชื่อบัญชี", placeholder: "บริษัท ... จำกัด" },
  { key: "payment.accountNo", label: "เลขที่บัญชี", placeholder: "xxx-x-xxxxx-x" },
  { key: "payment.bankName", label: "ธนาคาร", placeholder: "ธนาคาร..." },
  { key: "payment.closing", label: "ข้อความปิดท้าย", placeholder: "ถ้าชำระมาแล้วรบกวนส่งสลิปในกลุ่มให้ด้วยนะครับ" },
];

export function PaymentSettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/payment").then((r) => r.json()).then((j) => setValues(j.data ?? {}));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) toast.success("บันทึกแล้ว");
      else toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">ข้อความแจ้งยอด</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        ใช้ในข้อความแจ้งยอดที่เจ้าหน้าที่คัดลอกไปส่งในกลุ่ม LINE ของลูกค้า (ระบบไม่ส่งถึงลูกค้าเอง)
      </p>
      <Card>
        <CardContent className="p-5 space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              บันทึก
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
