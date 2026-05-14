import { SkeletonCard } from "@elearning/ui";

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-warm" aria-hidden="true" />
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="min-h-48" />
        ))}
      </div>
    </div>
  );
}
