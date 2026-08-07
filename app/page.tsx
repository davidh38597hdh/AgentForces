import Link from 'next/link';
import { isGoogleAuthConfigured } from '@/lib/auth-mode';
import { Logo } from '@/components/Logo';

const PILLARS = [
  {
    title: 'Force, not framework',
    body: 'Design and run a mesh in product — not another library to embed and operate yourself.',
  },
  {
    title: 'Boundaries by design',
    body: 'Companies, networks, and Ext-only edges. Cross-org talk is intentional, never a flat free-for-all.',
  },
  {
    title: 'Chief + networks',
    body: 'Research, computation, creative — chief routes the primary network; hops stay visible.',
  },
  {
    title: 'Your keys, your models',
    body: 'BYOK per agent: xAI, OpenAI, Anthropic. Token router prefers your keys over ours.',
  },
  {
    title: 'Mesh protocol path',
    body: 'AMEP/1 session identity today. Sealed inter-agent hops are the security roadmap — not an afterthought.',
  },
  {
    title: 'Operator UX',
    body: 'Agent library, inspector, canvas, hop logs. Built for people who field forces, not only write them.',
  },
] as const;

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
        {/* Wordmark */}
        <div className="mb-6 sm:mb-8 overflow-visible flex items-center gap-4 sm:gap-5">
          <Logo size={56} className="shrink-0" />
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight af-title-gradient">
            AgentForces
          </h1>
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 mb-4">
          Private multi-agent mesh for business outcomes
        </p>

        {/* Hero card */}
        <div className="af-card rounded-3xl px-6 sm:px-10 py-10 sm:py-12 mb-10">
          <p className="text-lg sm:text-xl text-zinc-100 mb-4 max-w-2xl leading-relaxed font-medium">
            Create your own force with a mesh of agents who work together to get common outcomes.
          </p>
          <p className="text-sm text-zinc-400 mb-3 max-w-2xl leading-relaxed">
            Not a framework you embed. A product where you field agents across companies and
            networks — with controlled interfaces, chief routing, and your own API keys.
          </p>
          <p className="text-sm text-zinc-500 mb-8 max-w-2xl leading-relaxed">
            LangGraph programs control flow. CrewAI staffs a crew in code.{' '}
            <span className="text-zinc-300">AgentForces fields a force</span> — with edges that
            respect who can talk to whom.
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
          {!googleReady && (
            <p className="mt-4 text-[11px] text-amber-500/80">
              Production requires Google OAuth env (GOOGLE_CLIENT_ID + SECRET + AUTH_SECRET).
            </p>
          )}
        </div>

        {/* Differentiator grid */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 tracking-wide mb-1">
            Why AgentForces
          </h2>
          <p className="text-xs text-zinc-600 mb-5 max-w-xl">
            Built for multi-party agent work — not another notebook of agent loops.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-white/[0.07] bg-black/50 px-4 py-4 hover:border-violet-500/30 transition-colors"
            >
              <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">{p.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        {/* Comparison strip */}
        <div className="af-card rounded-2xl px-5 sm:px-8 py-6 mb-8 overflow-x-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            Layer comparison
          </p>
          <table className="w-full text-left text-xs min-w-[520px]">
            <thead>
              <tr className="text-zinc-500 border-b border-white/[0.06]">
                <th className="pb-2 pr-4 font-medium"> </th>
                <th className="pb-2 pr-4 font-medium">LangGraph</th>
                <th className="pb-2 pr-4 font-medium">CrewAI</th>
                <th className="pb-2 font-medium text-[var(--cyan-soft)]">AgentForces</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 pr-4 text-zinc-500">What it is</td>
                <td className="py-2.5 pr-4">Graph runtime in code</td>
                <td className="py-2.5 pr-4">Crews & roles in code</td>
                <td className="py-2.5 text-zinc-200">Mesh product & canvas</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 pr-4 text-zinc-500">Boundaries</td>
                <td className="py-2.5 pr-4">Your app</td>
                <td className="py-2.5 pr-4">Your app</td>
                <td className="py-2.5 text-zinc-200">Companies · networks · Ext</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2.5 pr-4 text-zinc-500">Security story</td>
                <td className="py-2.5 pr-4">App-level</td>
                <td className="py-2.5 pr-4">App-level</td>
                <td className="py-2.5 text-zinc-200">AMEP/1 path · auth · BYOK</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 text-zinc-500">Buyer</td>
                <td className="py-2.5 pr-4">Engineers embedding agents</td>
                <td className="py-2.5 pr-4">Builders scripting teams</td>
                <td className="py-2.5 text-zinc-200">Teams fielding a force</td>
              </tr>
            </tbody>
          </table>
        </div>
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
