import Link from 'next/link';
import { isGoogleAuthConfigured } from '@/lib/auth-mode';
import { Logo } from '@/components/Logo';

export default function Home() {
  const googleReady = isGoogleAuthConfigured();

  return (
    <div className="min-h-screen af-page-bg text-[var(--foreground)] flex flex-col relative overflow-hidden">
      <div className="af-orb af-orb-purple" aria-hidden />
      <div className="af-orb af-orb-cyan" aria-hidden />
      <div className="af-orb af-orb-purple-soft" aria-hidden />

      <header className="af-glass relative z-10">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Logo size={26} />
            <span className="text-sm font-semibold tracking-wide text-zinc-100 group-hover:text-white transition-colors">
              AgentForces
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-400 hover:text-[var(--purple-soft)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/portal"
              className="text-xs font-medium text-zinc-300 hover:text-[var(--cyan-soft)] transition-colors"
            >
              Portal →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 pt-20 sm:pt-28 pb-16 w-full relative z-10 overflow-visible">
        <div className="mb-6 sm:mb-8 overflow-visible flex items-center gap-4 sm:gap-5">
          <Logo size={56} className="shrink-0" />
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight af-title-gradient">
            AgentForces
          </h1>
        </div>

        <div className="af-card rounded-3xl px-6 sm:px-10 py-10 sm:py-12">
          <p className="text-base sm:text-lg text-zinc-200 mb-4 max-w-xl leading-relaxed">
            Create your own force with a mesh of agents who work together to get common outcomes.
          </p>
          <p className="text-sm text-zinc-500 mb-4 max-w-lg leading-relaxed">
            Multi-network meshes — chief routing, inter-network bus, your keys
          </p>
          <p className="text-sm text-zinc-500 mb-10 max-w-lg leading-relaxed">
            Sign in with Google, pick a project in the portal, then open your mesh.
            {!googleReady && (
              <span className="block mt-2 text-amber-500/80">
                Tip: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel for live OAuth.
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="af-btn-primary">
              Continue with Google
            </Link>
            <Link href="/portal" className="af-btn-ghost">
              Open portal
            </Link>
            <Link href="/dashboard" className="af-btn-ghost">
              Mesh canvas
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-zinc-600 tracking-wide">Orchestrate Utilizing AMEP/1</p>
          <p className="text-[11px] text-zinc-600">agentxforces.com</p>
        </div>
      </footer>
    </div>
  );
}
