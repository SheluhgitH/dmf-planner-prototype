import { NextResponse } from "next/server";
import { createClient } from "@/lib/data/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const { error } = await supabase.rpc("join_shared_workspace");
    if (error) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
