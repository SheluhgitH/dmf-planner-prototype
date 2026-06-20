"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

export function InviteTeammatesCard({
  workspaceName,
  appUrl = "https://dmf-planner-prototype.vercel.app",
}: {
  workspaceName: string;
  appUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const inviteMessage = `Join me on DMF Planner (${workspaceName})!\n\n1. Sign up at ${appUrl}/signup\n2. Confirm your email\n3. You'll auto-join the shared workspace\n\nSee you in #general!`;

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-sm font-medium text-zinc-200">Invite teammates</p>
      <p className="mt-1 text-xs text-zinc-500">
        Share this message so friends can sign up and join {workspaceName}.
      </p>
      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">
        {inviteMessage}
      </pre>
      <Button size="sm" className="mt-3" onClick={() => void copyInvite()}>
        {copied ? (
          <>
            <Check className="mr-1 h-4 w-4" /> Copied
          </>
        ) : (
          <>
            <Copy className="mr-1 h-4 w-4" /> Copy invite message
          </>
        )}
      </Button>
    </div>
  );
}
