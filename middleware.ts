import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Uploaded files live in public/uploads, which Next would serve to anyone (and Cloudflare would
  // cache publicly). Every file must go through /api/uploads, which checks the session and access.
  if (req.nextUrl.pathname.startsWith("/uploads/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/api${req.nextUrl.pathname}`;
    return NextResponse.redirect(url);
  }

  // Expose the requested path+query to server components so an unauthenticated visit can be sent to
  // /login?callbackUrl=… and come back to the same page (e.g. a link opened from a LINE message).
  const headers = new Headers(req.headers);
  headers.set("x-app-path", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
