export function InlineError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}
