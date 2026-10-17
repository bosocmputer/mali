import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Expose the requested path+query to server components so an unauthenticated visit can be sent to
// /login?callbackUrl=… and come back to the same page (e.g. a link opened from a LINE message).
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-app-path", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
