import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-5 h-12 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-500">AgentForces</span>
          <div className="flex items-center gap-4">
            <Link href="/portal" className="text-xs text-zinc-500 hover:text-zinc-300">
              Portal →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-28 pb-20">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-4">
          Orchestrate mesh · AMEP/1 concepts
        </p>
        <h1 className="text-5xl sm:text-6xl font-medium tracking-tight text-zinc-200 mb-6">
          AgentForces
        </h1>
        <p className="text-lg text-zinc-500 mb-4 max-w-lg leading-relaxed">
          Multi-network agent meshes — chief routing, inter-network bus, your keys
        </p>
        <p className="text-zinc-600 mb-12 max-w-lg leading-relaxed text-sm">
          Pick a project in the portal, then open your mesh. Sign-in is optional for now (Google
          auth not enabled).
        </p>
        <div className="flex gap-3">
          <Link
            href="/portal"
            className="inline-flex h-10 items-center px-5 rounded-lg bg-white text-black text-sm font-medium"
          >
            Open portal
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center px-5 rounded-lg border border-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            Mesh canvas
          </Link>
        </div>
      </main>
    </div>
  );
}
