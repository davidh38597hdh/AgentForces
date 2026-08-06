'use client';

import { useState } from 'react';
import Link from 'next/link';

type Agent = {
  id: string;
  name: string;
  system: string;
};

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Researcher',
      system:
        'You are a thorough research agent. Gather key facts, structure findings clearly, and surface the most important insights.',
    },
    {
      id: '2',
      name: 'Analyst',
      system:
        'You are an analytical agent. Take previous research, extract patterns, identify implications, and recommend clear next steps.',
    },
  ]);

  const [task, setTask] = useState(
    'Analyze the current state of multi-agent AI systems and their practical value for small startups in 2026.'
  );
  const [log, setLog] = useState<{ agent: string; output: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const addAgent = () => {
    setAgents([
      ...agents,
      {
        id: Date.now().toString(),
        name: `Agent ${agents.length + 1}`,
        system: 'You are a specialized agent. Be concise, useful, and focused on your role.',
      },
    ]);
  };

  const updateAgent = (id: string, field: 'name' | 'system', value: string) => {
    setAgents(agents.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const removeAgent = (id: string) => {
    if (agents.length <= 1) return;
    setAgents(agents.filter((a) => a.id !== id));
  };

  const runTeam = async () => {
    if (!task.trim() || agents.length === 0) return;
    setRunning(true);
    setError('');
    setLog([]);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: agents.map(({ name, system }) => ({ name, system })),
          task,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Orchestration failed');

      setLog(data.log || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Check that XAI_API_KEY is set in Vercel.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        <nav className="border-b border-white/5">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-black">
                  AX
                </div>
                <span className="font-medium tracking-tight text-sm">AgentxForce</span>
              </Link>
              <span className="text-zinc-600 text-sm">/</span>
              <span className="text-zinc-400 text-sm">Multi-Agent Team</span>
            </div>
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Landing
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Multi-Agent Team</h1>
            <p className="text-sm text-zinc-500">
              Define agents → run them sequentially → each agent builds on the previous one
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Agents ({agents.length})
              </h2>
              <button
                onClick={addAgent}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                + Add Agent
              </button>
            </div>

            <div className="space-y-3">
              {agents.map((agent, idx) => (
                <div
                  key={agent.id}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-zinc-600 w-5">{idx + 1}</span>
                    <input
                      value={agent.name}
                      onChange={(e) => updateAgent(agent.id, 'name', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-blue-500/50"
                      placeholder="Agent name"
                    />
                    <button
                      onClick={() => removeAgent(agent.id)}
                      disabled={agents.length <= 1}
                      className="text-xs text-zinc-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    value={agent.system}
                    onChange={(e) => updateAgent(agent.id, 'system', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-zinc-300 focus:outline-none focus:border-blue-500/50 resize-none"
                    placeholder="System prompt / role"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Initial Task
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
              placeholder="What should the multi-agent team work on?"
            />
          </div>

          <button
            onClick={runTeam}
            disabled={running || agents.length === 0 || !task.trim()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {running ? 'Running multi-agent team...' : 'Run Multi-Agent Team'}
          </button>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          {log.length > 0 && (
            <div className="mt-12">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-5">
                Execution Log
              </h2>
              <div className="space-y-4">
                {log.map((entry, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-blue-400">
                        {i + 1}. {entry.agent}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {entry.output}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
