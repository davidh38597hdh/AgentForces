import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* Hero */}
        <section className="px-6 pt-24 pb-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Core agent live · Multi-agent next
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.1] mb-6">
            Multi-agent teams
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              powered by Grok
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Create specialized agents, chain them together, and run real multi-agent workflows —
            without heavy frameworks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Open Dashboard
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 transition-colors"
            >
              See Features
            </a>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-20 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Agent Builder',
                  desc: 'Define roles and system prompts in seconds. Grok by default.',
                },
                {
                  title: 'Multi-Agent Orchestration',
                  desc: 'Sequential workflows. Agents hand work to each other automatically.',
                },
                {
                  title: 'Share & Iterate',
                  desc: 'Public run links perfect for demos and X. Built for builders.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all"
                >
                  <h3 className="text-lg font-medium mb-2 text-white">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Templates teaser */}
        <section className="px-6 py-20 border-t border-white/5 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Starter Templates</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Research Team · Coding Agents · Analysis Pipeline · Personal Ops
          </p>
          <p className="text-sm text-gray-500">More coming with early access.</p>
        </section>

        {/* Footer */}
        <footer className="px-6 py-10 border-t border-white/5 text-center text-sm text-gray-500">
          AgentxForce · Built for multi-agent builders · Powered by Grok
        </footer>
      </div>
    </div>
  );
}
