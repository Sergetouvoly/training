export function Skeleton({ className = "" }: { readonly className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-warm ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = "" }: { readonly className?: string }) {
  return (
    <div className={`rounded-2xl border border-surface-warm bg-white p-6 shadow-sm ${className}`}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-8 w-1/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { readonly rows?: number }) {
  return (
    <div className="rounded-2xl border border-surface-warm bg-white overflow-hidden">
      <div className="border-b border-surface-warm bg-surface px-5 py-3 flex gap-6">
        {["w-2/5", "w-1/5", "w-1/5", "w-1/5"].map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-surface-warm px-5 py-4 last:border-0">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-7 w-14 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
