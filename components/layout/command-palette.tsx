"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchWorkspaceAction } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/data/types";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { results: data } = await searchWorkspaceAction(query);
      setResults(data ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh]">
      <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, tasks, events, channels..."
            className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          />
          <kbd className="rounded border border-zinc-700 px-1.5 text-[10px] text-zinc-500">
            Esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2">
          {loading && (
            <li className="px-4 py-2 text-sm text-zinc-500">Searching...</li>
          )}
          {!loading && query && results.length === 0 && (
            <li className="px-4 py-2 text-sm text-zinc-500">No results</li>
          )}
          {results.map((r) => (
            <li key={`${r.type}-${r.id}`}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(r.link);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-zinc-800"
              >
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
                  {r.type}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{r.title}</p>
                  {r.subtitle && (
                    <p className="truncate text-xs text-zinc-500">{r.subtitle}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
