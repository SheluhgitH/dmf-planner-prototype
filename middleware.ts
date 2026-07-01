import { NextResponse, type NextRequest } from "next/server";
import {
  MOCK_SESSION_COOKIE,
  isProtectedRoute,
  isSupabaseConfigured,
} from "@/lib/config";
import {
  hasSupabaseAuthCookie,
  updateSession,
} from "@/lib/data/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedRoute = isProtectedRoute(pathname);

  if (isSupabaseConfigured()) {
    // Avoid a Supabase round-trip on public pages for anonymous visitors.
    if (!protectedRoute && !hasSupabaseAuthCookie(request)) {
      return NextResponse.next();
    }

    const { response, user } = await updateSession(request);

    if (protectedRoute && !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  if (!protectedRoute) {
    return NextResponse.next();
  }

  const mockSession = request.cookies.get(MOCK_SESSION_COOKIE);
  if (!mockSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
