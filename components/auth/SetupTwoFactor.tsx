"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Step-by-step enrolment for office staff: install an authenticator app, scan, type the code.
 * Remembering the device is on by default so the 8-hour idle logout only asks for the password.
 */
export function SetupTwoFactor({ email }: { email: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/mfa/setup", { method: "POST" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (ok) {
          setQr(j.data.qrDataUrl);
          setSecret(j.data.secret);
        } else setError(j.error ?? "เริ่มตั้งค่าไม่สำเร็จ");
      })
      .catch(() => setError("ไม่สามารถเชื่อมต่อได้"));
  }, []);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, remember }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "ยืนยันไม่สำเร็จ");
        return;
      }
      await update({ mfa: "refresh" });
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-2 pt-8">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-xl font-bold">ตั้งค่ายืนยันตัวตนสองชั้น</h1>
          <p className="text-sm text-muted-foreground">
            MALI เก็บรหัสเข้าเว็บหน่วยงานรัฐ จึงต้องใช้รหัสจากมือถือทุกบัญชี ({email})
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pb-8 px-8">
          <ol className="space-y-4 text-sm">
            <li className="flex gap-2">
              <span className="font-bold text-primary">1.</span>
              <span>
                ติดตั้งแอป <b>Google Authenticator</b> หรือ <b>Microsoft Authenticator</b> บนมือถือ
                <Smartphone className="inline h-4 w-4 ml-1 text-muted-foreground" />
              </span>
            </li>
            <li className="space-y-2">
              <div className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>ในแอปกด “+” แล้วสแกน QR นี้</span>
              </div>
              <div className="flex justify-center">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR สำหรับแอปยืนยันตัวตน" width={220} height={220} className="rounded-md border bg-white p-1" />
                ) : (
                  <div className="h-[220px] w-[220px] flex items-center justify-center rounded-md border">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {secret && (
                <p className="text-xs text-muted-foreground text-center break-all">
                  สแกนไม่ได้? พิมพ์รหัสนี้ในแอปแทน: <span className="font-mono">{secret}</span>
                </p>
              )}
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>พิมพ์ตัวเลข 6 หลักที่แอปแสดง</span>
            </li>
          </ol>

          <form onSubmit={confirm} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">รหัส 6 หลัก</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-11 text-center text-lg tracking-[0.4em] font-mono"
                placeholder="000000"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              จำเครื่องนี้ 30 วัน (ไม่ต้องใส่รหัสจากมือถือทุกครั้ง)
            </label>
            {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
            <Button type="submit" className="w-full h-11" disabled={busy || code.length !== 6 || !qr}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันและเริ่มใช้งาน"}
            </Button>
            <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="w-full text-xs text-muted-foreground hover:text-foreground">
              ออกจากระบบ
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
