import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="px-6 py-24 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          AgentxForce<br />Multi-Agent Teams Powered by Grok
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Create, connect, and run intelligent agent networks in minutes — no complex frameworks required.
          Real-time execution. Full logs. One-click shareable demos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition"
          >
            Try Core Agent Dashboard
          </Link>
          <form className="flex gap-2">
            <input
              type="email"
              placeholder="Email for waitlist"
              className="px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition"
            >
              Join Waitlist
            </button>
          </form>
        </div>
        <p className="mt-4 text-sm text-gray-500">Core Grok agent live · Multi-agent chaining next</p>
      </section>

      <section className="px-6 py-16 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-3">Agent Builder</h3>
            <p className="text-gray-400">Define roles, system prompts, and tools in seconds. Grok by default.</p>
          </div>
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-3">Multi-Agent Orchestration</h3>
            <p className="text-gray-400">Sequential and parallel workflows. Real-time streaming and full logs.</p>
          </div>
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h3 className="text-xl font-semibold mb-3">Share & Iterate</h3>
            <p className="text-gray-400">Public shareable run links. Perfect for demos and X virality.</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 border-t border-zinc-800 text-center">
        <h2 className="text-3xl font-bold mb-6">Starter Templates</h2>
        <p className="text-gray-400 mb-8">Research Team · Coding Agents · Analysis Pipeline · Personal Ops</p>
        <p className="text-sm text-gray-500">More coming with early access.</p>
      </section>

      <footer className="px-6 py-12 border-t border-zinc-800 text-center text-gray-500 text-sm">
        <p>AgentxForce · Built for multi-agent builders · Powered by Grok</p>
      </footer>
    </div>
  );
}