import { NextResponse, type NextRequest } from "next/server";
import {
  MOCK_SESSION_COOKIE,
  isProtectedRoute,
  isSupabaseConfigured,
} from "@/lib/config";
import { updateSession } from "@/lib/data/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    if (isSupabaseConfigured()) {
      return updateSession(request);
    }
    return NextResponse.next();
  }

  if (isSupabaseConfigured()) {
    const response = await updateSession(request);
    const supabase = await import("@supabase/ssr").then(({ createServerClient }) =>
      createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {},
          },
        }
      )
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
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
