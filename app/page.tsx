import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-5 h-12 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">AgentForce</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300">Sign in</Link>
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300">Open →</Link>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 pt-24 pb-20">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-5">
          Multi-agent graphs<br />
          <span className="text-zinc-500">your keys · your models</span>
        </h1>
        <p className="text-zinc-400 mb-10 max-w-md leading-relaxed">
          Bring your own API keys, connect agent nodes, and run outcomes. Token routing is built for a future control plane.
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard" className="inline-flex h-10 items-center px-5 rounded-lg bg-white text-black text-sm font-medium">
            Open dashboard
          </Link>
          <Link href="/login" className="inline-flex h-10 items-center px-5 rounded-lg border border-zinc-700 text-sm text-zinc-300">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
