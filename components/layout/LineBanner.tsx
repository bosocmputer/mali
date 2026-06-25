"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "line_banner_dismissed";

export function LineBanner() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (!json?.data?.lineUserId) setShow(true);
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  function goProfile() {
    dismiss();
    router.push("/profile");
  }

  if (!show) return null;

  return (
    <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 px-4 md:px-6 py-2.5 flex items-center gap-3">
      <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
      <p className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">
        เชื่อมต่อ LINE เพื่อรับแจ้งเตือนงานอัตโนมัติ
      </p>
      <Button
        size="sm"
        className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
        onClick={goProfile}
      >
        เชื่อมต่อเลย
      </Button>
      <button
        onClick={dismiss}
        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 flex-shrink-0"
        aria-label="ปิด"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
