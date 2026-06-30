// Optimistic auth routing (this Next version renamed `middleware` → `proxy`).
// Refreshes the Supabase session on every matched request, then redirects:
//   * unauthenticated → /login when hitting a protected route
//   * authenticated   → /dashboard when hitting an auth page
// This is optimistic ONLY — pages, Server Actions, and RLS re-check for real.
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

const PROTECTED = ["/dashboard"];
const AUTH_PAGES = ["/login", "/signup"];

const startsWith = (path: string, roots: string[]) =>
  roots.some((r) => path === r || path.startsWith(r + "/"));

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (startsWith(path, PROTECTED) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  if (startsWith(path, AUTH_PAGES) && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals, the API, and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
