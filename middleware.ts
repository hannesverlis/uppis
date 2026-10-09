import { NextResponse, type NextRequest } from "next/server";

const ACTOR_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TONES = new Set(["client", "helper", "admin"]);

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-uppis-path", request.nextUrl.pathname);
  const actor = request.nextUrl.searchParams.get("as") ?? "";
  if (ACTOR_RE.test(actor)) requestHeaders.set("x-uppis-actor", actor);
  const tone = request.nextUrl.searchParams.get("tone") ?? "";
  if (TONES.has(tone)) requestHeaders.set("x-uppis-tone", tone);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
