'use client';

import { useState } from 'react';
import Link from 'next/link';

type Agent = {
  id: string;
  name: string;
  system: string;
};

const ROLE_SUGGESTIONS = [
  {
    name: 'Researcher',
    system:
      'You are a thorough research agent. Gather key facts, structure findings clearly, and surface the most important insights.',
  },
  {
    name: 'Analyst',
    system:
      'You are an analytical agent. Extract patterns, identify implications, and recommend clear next steps.',
  },
  {
    name: 'Strategist',
    system:
      'You are a strategist. Define positioning, priorities, and a practical plan of action.',
  },
  {
    name: 'Writer',
    system:
      'You are a clear writer. Turn ideas into structured, readable content.',
  },
  {
    name: 'Critic',
    system:
      'You are a sharp critic. Challenge assumptions, find weak points, and suggest improvements.',
  },
  {
    name: 'Financial Analyst',
    system:
      'You are a practical financial analyst. Focus on numbers, assumptions, risks, and realistic projections.',
  },
];

function newAgent(index: number, preset?: { name: string; system: string }): Agent {
  return {
    id: `${Date.now()}-${index}`,
    name: preset?.name || `Agent ${index}`,
    system:
      preset?.system ||
      'You are a specialized agent. Be clear, useful, and focused on your role.',
  };
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([newAgent(1, ROLE_SUGGESTIONS[0])]);
  const [task, setTask] = useState('');
  const [contextText, setContextText] = useState('');
  const [urls, setUrls] = useState('');
  const [log, setLog] = useState<{ agent: string; output: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const addAgent = (preset?: { name: string; system: string }) => {
    if (agents.length >= 5) return;
    setAgents([...agents, newAgent(agents.length + 1, preset)]);
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

    const urlList = urls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: agents.map(({ name, system }) => ({ name, system })),
          task,
          contextText,
          urls: urlList,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'API /api/orchestrate did not return JSON. The route may be missing on this deploy.'
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Orchestration failed');
      setLog(data.log || []);
    } catch (err: any) {
      setError(
        err.message ||
          'Something went wrong. Confirm XAI_API_KEY is set in Vercel Environment Variables.'
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        <nav className="border-b border-white/5">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-black">
                AX
              </div>
              <span className="font-medium tracking-tight text-sm">AgentxForce</span>
            </Link>
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Home
            </Link>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Build a team</h1>
            <p className="text-sm text-zinc-500">
              Start with one agent. Add more only when you need them. They run in order.
            </p>
          </div>

          {/* Task first — primary input */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              What should the team do?
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              placeholder="e.g. Research competitors for my AI note-taking app and recommend a positioning angle"
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          {/* Optional context */}
          <details className="mb-8 group">
            <summary className="text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 list-none flex items-center gap-2">
              <span className="text-zinc-600 group-open:rotate-90 transition-transform">›</span>
              Optional context & URLs
            </summary>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <label className="block text-[11px] text-zinc-600 mb-2">Notes</label>
                <textarea
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  rows={3}
                  placeholder="Product info, constraints, background..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm resize-none focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <label className="block text-[11px] text-zinc-600 mb-2">URLs (one per line)</label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={3}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm resize-none focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </details>

          {/* Agents — progressive */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Agents · run in order
              </h2>
              <span className="text-[11px] text-zinc-600">{agents.length} / 5</span>
            </div>

            <div className="space-y-3">
              {agents.map((agent, idx) => (
                <div key={agent.id} className="relative">
                  {idx > 0 && (
                    <div className="absolute -top-3 left-6 text-[10px] text-zinc-600">↓</div>
                  )}
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-zinc-400 shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        value={agent.name}
                        onChange={(e) => updateAgent(agent.id, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm font-medium focus:outline-none focus:border-blue-500/50"
                        placeholder="Role name"
                      />
                      {agents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAgent(agent.id)}
                          className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      value={agent.system}
                      onChange={(e) => updateAgent(agent.id, 'system', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-zinc-300 focus:outline-none focus:border-blue-500/50 resize-none"
                      placeholder="What should this agent do?"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add more */}
            {agents.length < 5 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => addAgent()}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/10 text-sm text-zinc-500 hover:text-white hover:border-white/20 hover:bg-white/[0.02] transition-all"
                >
                  + Add next agent
                </button>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-[11px] text-zinc-600 self-center mr-1">Quick roles:</span>
                  {ROLE_SUGGESTIONS.filter(
                    (r) => !agents.some((a) => a.name === r.name)
                  )
                    .slice(0, 4)
                    .map((role) => (
                      <button
                        key={role.name}
                        type="button"
                        onClick={() => addAgent(role)}
                        className="px-2.5 py-1 rounded-lg text-[11px] border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                      >
                        + {role.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={runTeam}
            disabled={running || !task.trim()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {running
              ? `Running ${agents.length} agent${agents.length > 1 ? 's' : ''} (20–40s)...`
              : agents.length === 1
              ? 'Run Agent'
              : `Run ${agents.length}-Agent Team`}
          </button>

          {error && (
            <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
              {error}
            </div>
          )}

          {log.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-5">
                Results
              </h2>
              <div className="space-y-4">
                {log.map((entry, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center">
                        {i + 1}
                      </div>
                      <span className="text-xs font-medium text-blue-400">{entry.agent}</span>
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
