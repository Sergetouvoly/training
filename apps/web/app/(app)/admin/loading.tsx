import { SkeletonTable, Skeleton } from "@elearning/ui";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-surface-warm bg-white p-6">
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}
