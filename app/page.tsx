import Link from 'next/link';
import { isGoogleAuthConfigured } from '@/lib/auth-mode';
import { Logo } from '@/components/Logo';
import { LandingCarousel } from '@/components/LandingCarousel';

export default function Home() {
  const googleReady = isGoogleAuthConfigured();

  return (
    <div className="min-h-screen af-page-bg text-[var(--foreground)] flex flex-col relative overflow-hidden">
      <div className="af-orb af-orb-purple" aria-hidden />
      <div className="af-orb af-orb-cyan" aria-hidden />
      <div className="af-orb af-orb-purple-soft" aria-hidden />

      <header className="af-glass relative z-10">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
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

      <main className="flex-1 max-w-4xl mx-auto px-5 pt-16 sm:pt-24 pb-16 w-full relative z-10 overflow-visible">
        <LandingCarousel googleReady={googleReady} />
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-zinc-600 tracking-wide">
            Orchestrate Utilizing AMEP/1 · Force, not framework
          </p>
          <p className="text-[11px] text-zinc-600">agentxforces.com</p>
        </div>
      </footer>
    </div>
  );
}
