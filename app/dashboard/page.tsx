'use client';

import { useState } from 'react';
import Link from 'next/link';

type Agent = {
  id: string;
  name: string;
  system: string;
};

const ROLES = [
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
    system: 'You are a clear writer. Turn ideas into structured, readable content.',
  },
  {
    name: 'Critic',
    system:
      'You are a sharp critic. Challenge assumptions, find weak points, and suggest improvements.',
  },
];

function makeAgent(i: number, preset?: { name: string; system: string }): Agent {
  return {
    id: `${Date.now()}-${i}`,
    name: preset?.name ?? `Agent ${i}`,
    system:
      preset?.system ??
      'You are a specialized agent. Be clear, useful, and focused on your role.',
  };
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([makeAgent(1, ROLES[0])]);
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [urls, setUrls] = useState('');
  const [log, setLog] = useState<{ agent: string; output: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const add = (preset?: { name: string; system: string }) => {
    if (agents.length >= 5) return;
    setAgents([...agents, makeAgent(agents.length + 1, preset)]);
  };

  const update = (id: string, field: 'name' | 'system', value: string) => {
    setAgents(agents.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const remove = (id: string) => {
    if (agents.length <= 1) return;
    setAgents(agents.filter((a) => a.id !== id));
  };

  const run = async () => {
    if (!task.trim()) return;
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
          contextText: context,
          urls: urlList,
        }),
      });

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('API did not return JSON. Check deploy.');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLog(data.log || []);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Check XAI_API_KEY.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      {/* Nav */}
      <header className="border-b border-zinc-900">
        <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-tight text-zinc-300 hover:text-white">
            AgentForce
          </Link>
          <span className="text-xs text-zinc-600">Orchestration</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-12">
        {/* Task */}
        <section className="mb-10">
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={2}
            placeholder="What should the team do?"
            className="w-full bg-transparent text-lg text-zinc-100 placeholder:text-zinc-600 border-0 border-b border-zinc-800 focus:border-zinc-500 focus:outline-none resize-none pb-3 leading-relaxed"
          />
        </section>

        {/* Context — minimal */}
        <section className="mb-10">
          <details className="group">
            <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 select-none list-none">
              + Context
            </summary>
            <div className="mt-4 space-y-3">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                placeholder="Notes, background, constraints..."
                className="w-full bg-zinc-900/50 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 border border-zinc-800/80 focus:border-zinc-600 focus:outline-none resize-none"
              />
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={2}
                placeholder="URLs (one per line)"
                className="w-full bg-zinc-900/50 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 border border-zinc-800/80 focus:border-zinc-600 focus:outline-none resize-none"
              />
            </div>
          </details>
        </section>

        {/* Agents */}
        <section className="mb-10">
          <div className="space-y-0">
            {agents.map((agent, i) => (
              <div key={agent.id}>
                {i > 0 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-zinc-800" />
                  </div>
                )}
                <div className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] text-zinc-600 tabular-nums w-4">{i + 1}</span>
                    <input
                      value={agent.name}
                      onChange={(e) => update(agent.id, 'name', e.target.value)}
                      className="flex-1 bg-transparent text-sm font-medium text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                      placeholder="Role"
                    />
                    {agents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(agent.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-zinc-600 hover:text-zinc-400 transition-opacity"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    value={agent.system}
                    onChange={(e) => update(agent.id, 'system', e.target.value)}
                    rows={2}
                    className="w-full bg-transparent text-sm text-zinc-400 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed pl-7"
                    placeholder="Instructions for this agent..."
                  />
                </div>
              </div>
            ))}
          </div>

          {agents.length < 5 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => add()}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                + Agent
              </button>
              <div className="flex gap-1.5 flex-wrap">
                {ROLES.filter((r) => !agents.some((a) => a.name === r.name))
                  .slice(0, 3)
                  .map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() => add(r)}
                      className="text-[11px] px-2 py-0.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                    >
                      {r.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* Run */}
        <button
          type="button"
          onClick={run}
          disabled={running || !task.trim()}
          className="h-10 px-5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {running
            ? 'Running…'
            : agents.length === 1
            ? 'Run'
            : `Run ${agents.length} agents`}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-400/90">{error}</p>
        )}

        {/* Results */}
        {log.length > 0 && (
          <section className="mt-14 space-y-6">
            <div className="h-px bg-zinc-900" />
            {log.map((entry, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-zinc-600 tabular-nums">{i + 1}</span>
                  <span className="text-xs font-medium text-zinc-400">{entry.agent}</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap pl-5">
                  {entry.output}
                </p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
