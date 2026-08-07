import Link from 'next/link';
import { isGoogleAuthConfigured } from '@/lib/auth-mode';

export default function Home() {
  const googleEnabled = isGoogleAuthConfigured();

  return (
    <div className="min-h-screen af-page-bg text-[var(--foreground)] flex flex-col relative overflow-hidden">
      {/* Decorative orbs */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-16 h-80 w-80 rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }}
        aria-hidden
      />

      <header className="af-glass relative z-10">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide text-[var(--purple-light)]">
            AgentForces
          </span>
          <div className="flex items-center gap-5">
            {googleEnabled && (
              <Link
                href="/login"
                className="text-xs font-medium text-[var(--purple-soft)] hover:text-[var(--cyan-soft)] transition-colors"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/portal"
              className="text-xs font-medium text-[var(--cyan-soft)] hover:text-white transition-colors"
            >
              Portal →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 pt-24 sm:pt-32 pb-16 w-full relative z-10">
        <div className="af-card rounded-3xl px-6 sm:px-10 py-10 sm:py-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--cyan)] mb-5">
            Multi-agent mesh
          </p>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight af-title-gradient mb-6">
            AgentForces
          </h1>
          <p className="text-lg text-[var(--purple-light)] mb-4 max-w-lg leading-relaxed">
            Multi-network agent meshes — chief routing, inter-network bus, your keys
          </p>
          <p className="text-sm text-[var(--muted)] mb-10 max-w-lg leading-relaxed">
            {googleEnabled
              ? 'Sign in with Google, pick a project in the portal, then open your mesh.'
              : 'Pick a project in the portal, then open your mesh. Configure Google OAuth on Vercel to enable sign-in.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {googleEnabled ? (
              <Link href="/login" className="af-btn-primary">
                Continue with Google
              </Link>
            ) : null}
            <Link
              href="/portal"
              className={googleEnabled ? 'af-btn-ghost' : 'af-btn-primary'}
            >
              Open portal
            </Link>
            <Link href="/dashboard" className="af-btn-ghost">
              Mesh canvas
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-[var(--purple-soft)] tracking-wide">
            Orchestrate Utilizing AMEP/1
          </p>
          <p className="text-[11px] text-[var(--cyan-dim)]">agentxforces.com</p>
        </div>
      </footer>
    </div>
  );
}
