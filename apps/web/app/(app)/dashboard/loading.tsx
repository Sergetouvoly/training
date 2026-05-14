import { SkeletonCard, Skeleton } from "@elearning/ui";

export default function DashboardLoading() {
  return (
    <section aria-busy="true" aria-label="Chargement du tableau de bord">
      {/* Hero */}
      <div className="mb-6 h-32 animate-pulse rounded-2xl bg-primary/20" aria-hidden="true" />
      {/* KPIs */}
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="min-h-52" />
        ))}
      </div>
    </section>
  );
}
