"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_SESSION_COOKIE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/data/supabase/server";
import { signIn, signUp } from "@/lib/data/supabase/queries";

export async function mockLogin(email: string) {
  if (isSupabaseConfigured()) return;
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  redirect("/dashboard");
}

export async function mockSignup(email: string) {
  return mockLogin(email);
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const { signOut } = await import("@/lib/data/supabase/queries");
    await signOut();
  } else {
    const cookieStore = await cookies();
    cookieStore.delete(MOCK_SESSION_COOKIE);
  }
  redirect("/login");
}

export async function supabaseLogin(email: string, password: string) {
  const { signIn } = await import("@/lib/data/supabase/queries");
  const { error } = await signIn(email, password);
  if (error) return { error: error.message };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id")
      .limit(1);
    if (!workspaces?.length) {
      redirect("/onboarding");
    }
  }
  redirect("/dashboard");
}

export async function supabaseSignup(
  email: string,
  password: string,
  displayName: string
) {
  const { data, error } = await signUp(email, password, displayName);
  if (error) return { error: error.message };

  // Email confirmation enabled → no session yet
  if (!data?.session) {
    redirect("/signup/confirm-email");
  }
  redirect("/onboarding");
}
