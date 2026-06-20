"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  mockLogin,
  supabaseLogin,
} from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/config";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const useSupabase = isSupabaseConfigured();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (useSupabase) {
      const result = await supabaseLogin(email, password);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } else {
      await mockLogin(email);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-lg font-bold text-white">
              D
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-100">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {useSupabase
              ? "Sign in with your DMF Planner account"
              : "Demo mode — any email and password works"}
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Email</label>
            <Input
              name="email"
              type="email"
              placeholder="you@dmfstudio.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              Password
            </label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-violet-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
