import Link from 'next/link';

const COLORS: { name: string; varName: string; hex: string }[] = [
  { name: 'Black', varName: '--bg-deep', hex: '#000000' },
  { name: 'Near black', varName: '--bg-mid', hex: '#0a0a0a' },
  { name: 'Elevated', varName: '--bg-elevated', hex: '#111111' },
  { name: 'Purple deep', varName: '--purple-deep', hex: '#1a0a2e' },
  { name: 'Purple', varName: '--purple', hex: '#8b5cf6' },
  { name: 'Purple soft', varName: '--purple-soft', hex: '#a78bfa' },
  { name: 'Purple light', varName: '--purple-light', hex: '#d4c4fc' },
  { name: 'Cyan', varName: '--cyan', hex: '#22d3ee' },
  { name: 'Cyan soft', varName: '--cyan-soft', hex: '#67e8f9' },
  { name: 'Foreground', varName: '--foreground', hex: '#fafafa' },
];

/**
 * Local UI visualizer — design tokens, components, and live previews.
 * Open via `npm run dev` → http://localhost:3000/ui
 * No deploy required; hot-reloads with code changes.
 */
export default function UiVisualizerPage() {
  return (
    <div className="min-h-screen af-page-bg text-[var(--foreground)]">
      <header className="af-glass sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--purple-light)]">UI Visualizer</p>
            <p className="text-[10px] text-[var(--cyan)] tracking-wide">localhost · no deploy</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-xs">
            <Link href="/" className="text-[var(--purple-soft)] hover:text-white transition-colors">
              Landing
            </Link>
            <Link
              href="/login"
              className="text-[var(--purple-soft)] hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/portal"
              className="text-[var(--purple-soft)] hover:text-white transition-colors"
            >
              Portal
            </Link>
            <Link
              href="/dashboard"
              className="text-[var(--cyan-soft)] hover:text-white transition-colors"
            >
              Mesh
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10 space-y-12">
        <section>
          <h1 className="text-3xl sm:text-4xl font-semibold af-title-gradient mb-2">
            AgentForces design kit
          </h1>
          <p className="text-sm text-[var(--muted)] max-w-xl leading-relaxed">
            Edit <code className="text-[var(--cyan-soft)]">app/globals.css</code> and{' '}
            <code className="text-[var(--cyan-soft)]">app/page.tsx</code>, save, and this page
            updates. Run with <code className="text-[var(--cyan-soft)]">npm run dev</code>.
          </p>
        </section>

        {/* Colors */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--cyan)]">
            Color tokens
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {COLORS.map((c) => (
              <div
                key={c.varName}
                className="rounded-xl border border-[var(--border)] overflow-hidden bg-black/20"
              >
                <div className="h-16" style={{ background: c.hex }} />
                <div className="px-2.5 py-2">
                  <p className="text-xs font-medium text-white">{c.name}</p>
                  <p className="text-[10px] text-[var(--purple-soft)] font-mono">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Gradients */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--cyan)]">
            Gradients
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div
              className="h-28 rounded-2xl border border-[var(--border)]"
              style={{
                background:
                  'linear-gradient(120deg, #7c3aed 0%, #6366f1 45%, #22d3ee 100%)',
              }}
            />
            <div className="h-28 rounded-2xl border border-[var(--border)] af-page-bg" />
            <div className="sm:col-span-2 af-card rounded-2xl h-24 flex items-center justify-center">
              <span className="text-2xl font-semibold af-title-gradient">Title gradient text</span>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--cyan)]">
            Buttons
          </h2>
          <div className="af-card rounded-2xl p-6 flex flex-wrap gap-3 items-center">
            <button type="button" className="af-btn-primary">
              Primary
            </button>
            <button type="button" className="af-btn-ghost">
              Ghost
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center px-6 rounded-xl text-sm border border-[var(--cyan)] text-[var(--cyan-soft)]"
            >
              Outline cyan
            </button>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--cyan)]">
            Type
          </h2>
          <div className="af-card rounded-2xl p-6 space-y-3">
            <p className="text-4xl font-semibold af-title-gradient">Display / H1</p>
            <p className="text-xl text-[var(--purple-light)]">Lead — purple light</p>
            <p className="text-sm text-[var(--muted)]">
              Body muted — used for secondary copy and helper text on landing and login.
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--cyan)]">Eyebrow cyan</p>
          </div>
        </section>

        {/* Card / glass */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--cyan)]">
            Surfaces
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="af-card rounded-2xl p-6 min-h-[120px]">
              <p className="text-sm font-medium text-white mb-1">af-card</p>
              <p className="text-xs text-[var(--muted)]">Hero panels, login card</p>
            </div>
            <div className="af-glass rounded-2xl p-6 min-h-[120px] border border-[var(--border)]">
              <p className="text-sm font-medium text-white mb-1">af-glass</p>
              <p className="text-xs text-[var(--muted)]">Header / sticky bars</p>
            </div>
          </div>
        </section>

        {/* Live page previews */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--cyan)]">
            Live routes
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { href: '/', label: 'Landing', desc: 'Marketing hero + CTAs' },
              { href: '/login', label: 'Login', desc: 'Google / guest' },
              { href: '/portal', label: 'Portal', desc: 'Project templates' },
              { href: '/dashboard', label: 'Dashboard', desc: 'Mesh canvas' },
            ].map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="af-card rounded-2xl p-5 hover:border-[var(--cyan)] transition-colors block"
              >
                <p className="text-sm font-semibold text-white">{r.label}</p>
                <p className="text-xs text-[var(--muted)] mt-1">{r.desc}</p>
                <p className="text-[11px] text-[var(--cyan)] mt-3 font-mono">{r.href}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="af-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-2">How to use on Mac</h2>
          <ol className="text-sm text-[var(--muted)] space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              Terminal: <code className="text-[var(--cyan-soft)]">cd ~/code/AgentForces && npm run dev</code>
            </li>
            <li>
              Open <code className="text-[var(--cyan-soft)]">http://localhost:3000/ui</code>
            </li>
            <li>
              Edit CSS/components → save → browser refreshes (no Vercel deploy)
            </li>
          </ol>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-6">
        <div className="max-w-5xl mx-auto px-5 text-xs text-[var(--purple-soft)]">
          Orchestrate Utilizing AMEP/1 · UI kit local only
        </div>
      </footer>
    </div>
  );
}
