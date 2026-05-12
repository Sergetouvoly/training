// Refs: SPEC-CONTENT.md §6.2 — layout minimal pour prévisualisation admin
export default function PreviewLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="sticky top-0 z-50 flex h-10 items-center justify-between border-b border-surface-warm bg-primary-deep px-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent-bright animate-pulse" aria-hidden="true" />
          <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Mode prévisualisation</span>
        </div>
        <a
          href="javascript:history.back()"
          className="rounded-lg px-3 py-1 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          ← Retour à l'éditeur
        </a>
      </div>
      {children}
    </div>
  );
}
