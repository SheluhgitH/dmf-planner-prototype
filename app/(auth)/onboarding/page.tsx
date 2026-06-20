"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinSharedWorkspace } from "@/lib/auth/onboarding";
import { updateProfileAction } from "@/lib/actions/profile";
import { InlineError } from "@/components/ui/inline-error";

const tourSteps = [
  { title: "Chat", desc: "Channels, DMs, threads, and @mentions keep the team aligned." },
  { title: "Projects", desc: "Kanban boards for scripts, shoots, and deliverables." },
  { title: "Events", desc: "RSVPs and share table reads to #events." },
  { title: "Search", desc: "Press Cmd+K (Ctrl+K) to find anything fast." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    joinSharedWorkspace().then((result) => {
      setLoading(false);
      if (result?.error) setError(result.error);
      else setStep(1);
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: err } = await updateProfileAction(displayName);
    if (err) {
      setError(err);
      return;
    }
    setStep(2);
  }

  if (loading && step === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-zinc-400">Joining DMF Studio workspace…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100">Welcome to DMF Planner</h1>
            <p className="mt-2 text-sm text-zinc-400">What should we call you in chat?</p>
            <form onSubmit={saveProfile} className="mt-6 space-y-4">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100"
              />
              {error && <InlineError message={error} />}
              <Button type="submit" disabled={!displayName.trim()}>
                Continue
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100">Quick tour</h1>
            <p className="mt-2 text-sm text-zinc-400">Here&apos;s what you can do in DMF Studio.</p>
            <ul className="mt-6 space-y-3">
              {tourSteps.map((item) => (
                <li
                  key={item.title}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                >
                  <p className="font-medium text-zinc-200">{item.title}</p>
                  <p className="text-sm text-zinc-500">{item.desc}</p>
                </li>
              ))}
            </ul>
            <Button className="mt-6" onClick={() => setStep(3)}>
              Got it
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold text-zinc-100">You&apos;re in!</h1>
            <p className="mt-2 text-sm text-zinc-400">
              You&apos;ve joined the shared DMF Studio workspace. Say hello in #general.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/chat/general">
                <Button>Go to #general</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </>
        )}

        {error && step === 0 && (
          <div className="mt-4">
            <InlineError message={error} />
            <Button className="mt-3" variant="outline" onClick={() => router.push("/login")}>
              Back to login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
