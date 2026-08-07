'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

type Provider = 'xai' | 'openai' | 'anthropic';
type Agent = {
  id: string;
  name: string;
  system: string;
  provider: Provider;
  model: string;
  role: string;
};
type Edge = { from: string; to: string };
type LogEntry = { id: string; agent: string; provider: string; model: string; output: string };
type UserKeys = Partial<Record<Provider, string>>;

const KEYS_STORAGE = 'agentforce_user_keys_v1';

const MODELS: Record<Provider, { id: string; label: string }[]> = {
  xai: [
    { id: 'grok-3', label: 'Grok 3' },
    { id: 'grok-3-mini', label: 'Grok 3 Mini' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-latest', label: 'Claude Haiku' },
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet' },
  ],
};

const ROLE_PRESETS = [
  { id: 'research', name: 'Researcher', system: 'You are a research agent. Gather facts, structure findings, and surface important insights.' },
  { id: 'coding', name: 'Coder', system: 'You are a senior software engineer. Write clear code and practical implementation steps.' },
  { id: 'finance', name: 'Financial Analyst', system: 'You are a financial analyst. Focus on numbers, assumptions, risks, and realistic projections.' },
  { id: 'analyst', name: 'Analyst', system: 'You are an analytical agent. Extract patterns and concrete next steps.' },
  { id: 'writer', name: 'Writer', system: 'You are a clear writer. Turn analysis into structured readable content.' },
  { id: 'critic', name: 'Critic', system: 'You are a sharp critic. Challenge assumptions and suggest stronger alternatives.' },
];

function makeAgent(i: number, preset?: (typeof ROLE_PRESETS)[0]): Agent {
  const p = preset || ROLE_PRESETS[0];
  return {
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    name: p.name,
    system: p.system,
    provider: 'xai',
    model: 'grok-3',
    role: p.id,
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [agents, setAgents] = useState<Agent[]>([makeAgent(1)]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [urls, setUrls] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [genericWebhook, setGenericWebhook] = useState('');
  const [postOutcomeToSlack, setPostOutcomeToSlack] = useState(false);
  const [userKeys, setUserKeys] = useState<UserKeys>({});
  const [showKeys, setShowKeys] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [outcome, setOutcome] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS_STORAGE);
      if (raw) setUserKeys(JSON.parse(raw));
    } catch {}
  }, []);

  const saveKeys = (next: UserKeys) => {
    setUserKeys(next);
    try {
      localStorage.setItem(KEYS_STORAGE, JSON.stringify(next));
    } catch {}
  };

  const names = useMemo(() => {
    const m = new Map<string, string>();
    agents.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [agents]);

  const add = (preset?: (typeof ROLE_PRESETS)[0]) => {
    if (agents.length >= 6) return;
    setAgents([...agents, makeAgent(agents.length + 1, preset)]);
  };

  const update = (id: string, patch: Partial<Agent>) => {
    setAgents(agents.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const setProvider = (id: string, provider: Provider) => {
    update(id, { provider, model: MODELS[provider][0].id });
  };

  const applyRole = (id: string, roleId: string) => {
    const preset = ROLE_PRESETS.find((r) => r.id === roleId);
    if (!preset) return;
    update(id, { role: roleId, name: preset.name, system: preset.system });
  };

  const remove = (id: string) => {
    if (agents.length <= 1) return;
    setAgents(agents.filter((a) => a.id !== id));
    setEdges(edges.filter((e) => e.from !== id && e.to !== id));
  };

  const toggleEdge = (from: string, to: string) => {
    if (from === to) return;
    const exists = edges.some((e) => e.from === from && e.to === to);
    setEdges(exists ? edges.filter((e) => !(e.from === from && e.to === to)) : [...edges, { from, to }]);
  };

  const chainLinear = () => {
    const next: Edge[] = [];
    for (let i = 0; i < agents.length - 1; i++) next.push({ from: agents[i].id, to: agents[i + 1].id });
    setEdges(next);
  };

  const run = async () => {
    if (!task.trim()) return;
    setRunning(true);
    setError('');
    setLog([]);
    setOutcome('');
    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: agents.map(({ id, name, system, provider, model }) => ({ id, name, system, provider, model })),
          edges,
          task,
          contextText: context,
          urls: urls.split('\n').map((u) => u.trim()).filter((u) => u.startsWith('http')),
          userKeys: {
            xai: userKeys.xai || undefined,
            openai: userKeys.openai || undefined,
            anthropic: userKeys.anthropic || undefined,
          },
          connectors: {
            slackWebhook: postOutcomeToSlack ? slackWebhook.trim() : '',
            genericWebhook: genericWebhook.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLog(data.log || []);
      setOutcome(data.outcome || data.final || '');
    } catch (e: any) {
      setError(e.message || 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-5 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-zinc-300">AgentForce</Link>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <button type="button" onClick={() => setShowKeys((s) => !s)} className="hover:text-zinc-300">
              API keys
            </button>
            {session?.user?.email ? (
              <>
                <span className="text-zinc-600 hidden sm:inline">{session.user.email}</span>
                <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="hover:text-zinc-300">
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className="hover:text-zinc-300">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        {showKeys && (
          <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Your API keys (BYOK)</h2>
              <span className="text-[11px] text-zinc-600">Browser only · token router</span>
            </div>
            {(['xai', 'openai', 'anthropic'] as Provider[]).map((p) => (
              <div key={p}>
                <label className="block text-[11px] text-zinc-500 mb-1 uppercase">{p}</label>
                <input
                  type="password"
                  value={userKeys[p] || ''}
                  onChange={(e) => saveKeys({ ...userKeys, [p]: e.target.value })}
                  placeholder={p === 'xai' ? 'xai-...' : p === 'openai' ? 'sk-...' : 'sk-ant-...'}
                  className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>
            ))}
            <p className="text-[11px] text-zinc-600">
              Priority: control plane → your keys → server env.
            </p>
          </section>
        )}

        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder="What should the team do?"
          className="w-full bg-transparent text-lg border-0 border-b border-zinc-800 focus:border-zinc-500 focus:outline-none resize-none pb-3 mb-8"
        />

        <details className="mb-6">
          <summary className="text-xs text-zinc-600 cursor-pointer list-none">+ Shared context</summary>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="Notes for all agents..."
            className="mt-3 w-full bg-zinc-900/50 rounded-lg px-3 py-2.5 text-sm border border-zinc-800 focus:outline-none resize-none"
          />
        </details>

        <details className="mb-8">
          <summary className="text-xs text-zinc-600 cursor-pointer list-none">+ Connectors</summary>
          <div className="mt-4 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Web URLs (one per line)</label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={2}
                placeholder="https://example.com"
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm border border-zinc-800 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[11px] text-zinc-500 mb-1">
                <input
                  type="checkbox"
                  checked={postOutcomeToSlack}
                  onChange={(e) => setPostOutcomeToSlack(e.target.checked)}
                />
                Post outcome to Slack
              </label>
              <input
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm border border-zinc-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Generic webhook (Zapier → Gmail / Sheets)</label>
              <input
                value={genericWebhook}
                onChange={(e) => setGenericWebhook(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm border border-zinc-800 focus:outline-none"
              />
            </div>
          </div>
        </details>

        <div className="mb-3 flex justify-between">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Agents</h2>
          <span className="text-[11px] text-zinc-600">{agents.length}/6</span>
        </div>

        <div className="space-y-3 mb-4">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <select
                  value={agent.role}
                  onChange={(e) => applyRole(agent.id, e.target.value)}
                  className="text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1"
                >
                  {ROLE_PRESETS.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
                <input
                  value={agent.name}
                  onChange={(e) => update(agent.id, { name: e.target.value, role: 'custom' })}
                  className="flex-1 min-w-[80px] bg-transparent text-sm font-medium focus:outline-none"
                />
                <select
                  value={agent.provider}
                  onChange={(e) => setProvider(agent.id, e.target.value as Provider)}
                  className="text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1"
                >
                  <option value="xai">xAI</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <select
                  value={agent.model}
                  onChange={(e) => update(agent.id, { model: e.target.value })}
                  className="text-xs bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1"
                >
                  {MODELS[agent.provider].map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                {agents.length > 1 && (
                  <button type="button" onClick={() => remove(agent.id)} className="text-xs text-zinc-600 hover:text-red-400">
                    Remove
                  </button>
                )}
              </div>
              <textarea
                value={agent.system}
                onChange={(e) => update(agent.id, { system: e.target.value, role: 'custom' })}
                rows={2}
                className="w-full bg-transparent text-sm text-zinc-400 focus:outline-none resize-none mb-3"
              />
              {agents.length > 1 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/60">
                  <span className="text-[11px] text-zinc-600 self-center mr-1">→</span>
                  {agents.filter((a) => a.id !== agent.id).map((t) => {
                    const on = edges.some((e) => e.from === agent.id && e.to === t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleEdge(agent.id, t.id)}
                        className={`text-[11px] px-2 py-0.5 rounded-md border ${
                          on ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-zinc-800 text-zinc-600'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {agents.length < 6 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button type="button" onClick={() => add()} className="text-xs text-zinc-500">+ Agent</button>
            {ROLE_PRESETS.filter((r) => !agents.some((a) => a.role === r.id)).slice(0, 5).map((r) => (
              <button key={r.id} type="button" onClick={() => add(r)} className="text-[11px] text-zinc-600">
                {r.name}
              </button>
            ))}
          </div>
        )}

        <div className="mb-8">
          <div className="flex gap-3 mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Graph</span>
            <button type="button" onClick={chainLinear} className="text-[11px] text-zinc-500">Chain linear</button>
            <button type="button" onClick={() => setEdges([])} className="text-[11px] text-zinc-500">Clear</button>
          </div>
          {edges.length === 0 ? (
            <p className="text-xs text-zinc-600">No links — runs in list order</p>
          ) : (
            <ul className="text-xs text-zinc-400 space-y-1">
              {edges.map((e, i) => (
                <li key={i}>{names.get(e.from)} → {names.get(e.to)}</li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={run}
          disabled={running || !task.trim()}
          className="h-10 px-5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30"
        >
          {running ? 'Running…' : 'Run & produce outcome'}
        </button>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {log.length > 0 && (
          <section className="mt-14 space-y-8">
            <div className="h-px bg-zinc-900" />
            {outcome && (
              <div>
                <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Outcome</h2>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap">{outcome}</p>
                </div>
              </div>
            )}
            <div>
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Node outputs</h2>
              {log.map((entry, i) => (
                <div key={entry.id || i} className="mb-5">
                  <div className="flex gap-2 mb-1 text-xs">
                    <span className="text-zinc-600">{i + 1}</span>
                    <span className="text-zinc-300">{entry.agent}</span>
                    <span className="text-zinc-600">{entry.provider} · {entry.model}</span>
                  </div>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap pl-4">{entry.output}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
