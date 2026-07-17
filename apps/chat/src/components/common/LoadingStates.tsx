

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
        </div>
        <p className="text-xs text-zinc-600 font-medium">Loading…</p>
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-5 py-6 px-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="skeleton w-7 h-7 rounded-full shrink-0" />
          <div className="flex flex-col gap-2 flex-1 max-w-xl">
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="skeleton h-3.5 w-1/2 rounded" />
            <div className="skeleton h-3.5 w-5/6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
