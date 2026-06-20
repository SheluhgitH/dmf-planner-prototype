"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  mockSignup,
  supabaseSignup,
} from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/config";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const useSupabase = isSupabaseConfigured();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("displayName") as string;

    if (useSupabase) {
      const result = await supabaseSignup(email, password, displayName);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } else {
      await mockSignup(email);
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
          <h1 className="mt-4 text-2xl font-bold text-zinc-100">
            Create account
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {useSupabase
              ? "Join your team on DMF Planner"
              : "Demo mode — any details work"}
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              Display name
            </label>
            <Input
              name="displayName"
              type="text"
              placeholder="Your name"
              required
            />
          </div>
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
              minLength={6}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
