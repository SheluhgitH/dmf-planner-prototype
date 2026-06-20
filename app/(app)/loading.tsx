export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-800" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-900/60" />
        ))}
      </div>
    </div>
  );
}
