"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-zinc-100">Something went wrong</h2>
      <p className="max-w-md text-sm text-zinc-400">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
