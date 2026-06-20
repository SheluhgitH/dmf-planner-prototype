"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <CheckCircle className="mx-auto mb-6 h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold text-zinc-100">Confirm your email</h1>
        <p className="mt-3 text-sm text-zinc-400">
          A confirmation link has been sent to your email address. Please click
          the link to activate your account. Once confirmed, you can sign in and
          create your workspace.
        </p>
        <Link href="/login" className="mt-6 inline-block text-violet-400 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
