"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

const IDLE_MS = 8 * 60 * 60 * 1000; // NFR-14, 8 hours at the customer's request (was 30 minutes)
const WARN_MS = IDLE_MS - 2 * 60 * 1000;
const REFRESH_EVERY_MS = 5 * 60 * 1000; // keep the 8-hour session cookie rolling while in use
const KEY = "mali:lastActivity";

function readShared(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeShared(t: number) {
  try {
    localStorage.setItem(KEY, String(t));
  } catch {
    // private mode etc. — this tab still works on its own clock
  }
}

/**
 * Signs out after 8 hours without mouse, keyboard, touch or scroll (NFR-14). Activity is
 * shared between tabs through localStorage, so working in one tab keeps the others signed in.
 * While active, the session cookie is refreshed every few minutes; the server-side session
 * lifetime is 8 hours too, so a closed laptop also ends up signed out.
 */
export function IdleLogout() {
  const lastLocal = useRef(Date.now());
  const lastRefresh = useRef(Date.now());
  const warned = useRef(false);

  useEffect(() => {
    writeShared(Date.now());

    function onActivity() {
      const now = Date.now();
      lastLocal.current = now;
      warned.current = false;
      if (now - readShared() > 15_000) writeShared(now);
      if (now - lastRefresh.current > REFRESH_EVERY_MS) {
        lastRefresh.current = now;
        fetch("/api/auth/session", { cache: "no-store" }).catch(() => {});
      }
    }

    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const idle = Date.now() - Math.max(lastLocal.current, readShared());
      if (idle >= IDLE_MS) {
        window.clearInterval(timer);
        signOut({ callbackUrl: "/login?reason=idle" });
      } else if (idle >= WARN_MS && !warned.current) {
        warned.current = true;
        toast.warning("ไม่มีการใช้งานนาน ระบบจะออกจากระบบใน 2 นาที — ขยับเมาส์เพื่อใช้งานต่อ");
      }
    }, 15_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
