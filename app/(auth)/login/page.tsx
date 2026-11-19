"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // FR-109: after the password, accounts with 2FA are asked for the 6-digit code
  const [needOtp, setNeedOtp] = useState(false);
  const [remember, setRemember] = useState(true);
  // Lost or changed phone: a one-time code sent over LINE, then scan a new QR
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function requestRecovery(form: HTMLFormElement | null) {
    if (!form) return;
    const fd = new FormData(form);
    setSendingRecovery(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/mfa/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "ส่งรหัสไม่สำเร็จ");
        return;
      }
      setRecoveryMode(true);
      setInfo("ส่งรหัสกู้คืนไปที่ LINE ของคุณแล้ว (ใช้ได้ 10 นาที)");
    } finally {
      setSendingRecovery(false);
    }
  }
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    // read after mount so server and client render the same first frame
    if (new URLSearchParams(window.location.search).get("reason") === "idle") {
      setNotice("ออกจากระบบอัตโนมัติเพราะไม่มีการใช้งานเกิน 8 ชั่วโมง");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const otp = String(formData.get("otp") ?? "");
    const recovery = String(formData.get("recovery") ?? "");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      otp,
      recovery,
      redirect: false,
    });

    if (result?.error === "OTP_REQUIRED") {
      setNeedOtp(true);
      setLoading(false);
      return;
    }
    if (result?.error) {
      setError(
        result.error === "OTP_INVALID"
          ? "รหัสจากแอปไม่ถูกต้อง (รหัสเปลี่ยนทุก 30 วินาที)"
          : result.error === "RECOVERY_INVALID"
            ? "รหัสกู้คืนไม่ถูกต้อง"
            : result.error === "RECOVERY_EXPIRED"
              ? "รหัสกู้คืนหมดอายุหรือใส่ผิดหลายครั้ง — ขอรหัสใหม่"
              : "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
      );
      setLoading(false);
      return;
    }

    if (otp && !recovery && remember) await fetch("/api/mfa/trust", { method: "POST" }).catch(() => {});
    // A link from LINE sends people here first when they are not signed in; return them to it.
    // Only relative paths are accepted so this cannot be used as an open redirect.
    const target = new URLSearchParams(window.location.search).get("callbackUrl");
    const safe = target && target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
    router.push(safe);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center space-y-4 pb-2 pt-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-3xl font-bold tracking-tight">
                  M
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary tracking-wide">
                MALI
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monthly Automation Line Intelligence
              </p>
              <p className="text-xs text-muted-foreground">
                ระบบจัดการภาษีอัตโนมัติ
              </p>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  อีเมล
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="example@company.com"
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  รหัสผ่าน
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {needOtp && recoveryMode && (
                <div className="space-y-2">
                  <Label htmlFor="recovery" className="text-sm font-medium">
                    รหัสกู้คืนจาก LINE
                  </Label>
                  <Input
                    id="recovery"
                    name="recovery"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="000000"
                    className="h-11 text-center text-lg tracking-[0.4em] font-mono"
                  />
                  <p className="text-xs text-muted-foreground">เข้าสู่ระบบแล้วระบบจะให้สแกน QR ใหม่ด้วยมือถือเครื่องปัจจุบัน</p>
                  <button type="button" className="text-xs text-primary underline" onClick={() => { setRecoveryMode(false); setInfo(null); }}>
                    กลับไปใช้รหัสจากแอป
                  </button>
                </div>
              )}

              {needOtp && !recoveryMode && (
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium">
                    รหัส 6 หลักจากแอปยืนยันตัวตน
                  </Label>
                  <Input
                    id="otp"
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="000000"
                    className="h-11 text-center text-lg tracking-[0.4em] font-mono"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    จำเครื่องนี้ 30 วัน
                  </label>
                  <button
                    type="button"
                    disabled={sendingRecovery}
                    className="block text-xs text-primary underline disabled:opacity-50"
                    onClick={(e) => requestRecovery(e.currentTarget.form)}
                  >
                    {sendingRecovery ? "กำลังส่ง..." : "ลืมหรือเปลี่ยนมือถือ? รับรหัสกู้คืนทาง LINE"}
                  </button>
                </div>
              )}

              {info && !error && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
                  <p className="text-emerald-700 dark:text-emerald-400 text-sm text-center">{info}</p>
                </div>
              )}

              {notice && !error && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                  <p className="text-amber-700 dark:text-amber-400 text-sm text-center">{notice}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                  <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              MALI — ระบบจัดการงานภาษีสำหรับสำนักงานบัญชี · v1.1
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
