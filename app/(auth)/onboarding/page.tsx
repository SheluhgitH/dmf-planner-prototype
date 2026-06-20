"use client";

import { useEffect, useState } from "react";
import { joinSharedWorkspace } from "@/lib/auth/onboarding";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    joinSharedWorkspace().then((result) => {
      if (result?.error) setError(result.error);
    });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-zinc-100">Joining DMF Studio</h1>
        <p className="mt-3 text-sm text-zinc-400">
          {error
            ? error
            : "Setting up your access to the shared team workspace…"}
        </p>
      </div>
    </div>
  );
}
