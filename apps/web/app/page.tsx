export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg">
      <h1 className="text-4xl font-bold text-primary">Holenek</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Plateforme e-learning nouvelle génération
      </p>
      <div className="mt-8 flex gap-4">
        <button className="rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-deep">
          Commencer
        </button>
        <button className="rounded-lg border border-surface-warm px-6 py-3 text-primary hover:bg-surface">
          En savoir plus
        </button>
      </div>
    </main>
  );
}
