export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const MOCK_SESSION_COOKIE = "dmf-mock-session";

export const APP_ROUTES = [
  "/dashboard",
  "/onboarding", // add
  "/chat",
  "/projects",
  "/events",
  "/ai",
  "/settings",
] as const;

export function isProtectedRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
