import { NextResponse } from "next/server";
import { createTrustedDeviceToken, trustedDeviceCookieName } from "@/lib/trustedDevice";

/** Attach the "remember this device" cookie (httpOnly; MALI is served over the VPN on http). */
export function withTrustedDeviceCookie(res: NextResponse, userId: string, totpEnabledAt: Date): NextResponse {
  const { value, maxAge } = createTrustedDeviceToken(userId, totpEnabledAt);
  res.cookies.set(trustedDeviceCookieName(), value, { httpOnly: true, sameSite: "lax", path: "/", maxAge, secure: false });
  return res;
}
