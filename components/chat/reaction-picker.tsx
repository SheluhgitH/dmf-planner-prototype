"use client";

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "😂", "🎉", "👀"];

export function ReactionPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-lg">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded px-1.5 py-0.5 text-base hover:bg-zinc-800"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
