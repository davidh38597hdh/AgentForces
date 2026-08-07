'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import AgentNode, { type AgentNodeData } from './AgentNode';

type Provider = 'xai' | 'openai' | 'anthropic';
type UserKeys = Partial<Record<Provider, string>>;
type LogEntry = { id: string; agent: string; provider: string; model: string; output: string };

const KEYS_STORAGE = 'agentforce_user_keys_v1';

const COMPANIES = [
  { id: 'acme', name: 'Acme Corp', color: '#3b82f6' },
  { id: 'nova', name: 'Nova Labs', color: '#a855f7' },
  { id: 'orbit', name: 'Orbit Systems', color: '#14b8a6' },
];

const ROLE_PRESETS: {
  id: string;
  name: string;
  system: string;
  color: string;
  team: string;
  /** Typical external interface roles */
  defaultExposed: boolean;
}[] = [
  {
    id: 'ceo',
    name: 'CEO',
    system:
      'You are the CEO. Set direction, approve external commitments, and speak at the company interface. Be decisive and concise.',
    color: '#f59e0b',
    team: 'Executive',
    defaultExposed: true,
  },
  {
    id: 'product',
    name: 'Head of Product',
    system:
      'You are Head of Product. Own roadmap and partner-facing product decisions. Share only what partners need to collaborate.',
    color: '#3b82f6',
    team: 'Product',
    defaultExposed: true,
  },
  {
    id: 'finance_ops',
    name: 'Financial Operations',
    system:
      'You are Financial Operations. Handle budgets, invoices, and partner financial terms. Keep internal numbers private unless authorized.',
    color: '#eab308',
    team: 'Finance',
    defaultExposed: true,
  },
  {
    id: 'research',
    name: 'Researcher',
    system: 'You are a research agent. Gather facts and surface insights for your internal team.',
    color: '#60a5fa',
    team: 'Intel',
    defaultExposed: false,
  },
  {
    id: 'coding',
    name: 'Coder',
    system: 'You are a software engineer. Produce implementation plans and code for internal use.',
    color: '#22c55e',
    team: 'Engineering',
    defaultExposed: false,
  },
  {
    id: 'analyst',
    name: 'Analyst',
    system: 'You are an internal analyst. Extract patterns and next steps for your company only.',
    color: '#a855f7',
    team: 'Intel',
    defaultExposed: false,
  },
  {
    id: 'writer',
    name: 'Writer',
    system: 'You are a writer. Produce internal docs and, when exposed, partner-safe briefs.',
    color: '#ec4899',
    team: 'Content',
    defaultExposed: false,
  },
  {
    id: 'critic',
    name: 'Critic',
    system: 'You are an internal critic. Challenge assumptions before anything is shared externally.',
    color: '#f97316',
    team: 'QA',
    defaultExposed: false,
  },
];

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

const nodeTypes = { agent: AgentNode };

function makeNode(
  preset: (typeof ROLE_PRESETS)[0],
  company: (typeof COMPANIES)[0],
  index: number
): Node {
  const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
  const col = COMPANIES.findIndex((c) => c.id === company.id);
  return {
    id,
    type: 'agent',
    position: {
      x: 60 + col * 320 + (index % 2) * 40,
      y: 60 + Math.floor(index / 1) * 130 + (index % 3) * 20,
    },
    data: {
      name: preset.name,
      system: preset.system,
      provider: 'xai' as Provider,
      model: 'grok-3',
      role: preset.id,
      color: company.color,
      team: preset.team,
      company: company.name,
      exposed: preset.defaultExposed,
    } satisfies AgentNodeData,
  };
}

function edgeStyle(crossCompany: boolean): Partial<Edge> {
  if (crossCompany) {
    return {
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#f59e0b' },
      label: 'external',
      labelStyle: { fill: '#f59e0b', fontSize: 10 },
      labelBgStyle: { fill: '#18181b' },
    };
  }
  return {
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#52525b', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#71717a' },
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    makeNode(ROLE_PRESETS[3], COMPANIES[0], 0),
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addCompanyId, setAddCompanyId] = useState(COMPANIES[0].id);
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [urls, setUrls] = useState('');
  const [userKeys, setUserKeys] = useState<UserKeys>({});
  const [showKeys, setShowKeys] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [genericWebhook, setGenericWebhook] = useState('');
  const [postOutcomeToSlack, setPostOutcomeToSlack] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [outcome, setOutcome] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [connectHint, setConnectHint] = useState('');

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

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const getData = useCallback(
    (id: string) => nodes.find((n) => n.id === id)?.data as AgentNodeData | undefined,
    [nodes]
  );

  /** Allow many edges from one node; block cross-company unless both are exposed */
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target || source === target) return false;

      const s = getData(source);
      const t = getData(target);
      if (!s || !t) return false;

      const cross = s.company !== t.company;
      if (cross && !(s.exposed && t.exposed)) {
        setConnectHint(
          'Cross-company links require both nodes to be External interfaces (Ext).'
        );
        return false;
      }
      setConnectHint('');
      return true;
    },
    [getData]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;

      const s = getData(connection.source!);
      const t = getData(connection.target!);
      const cross = !!(s && t && s.company !== t.company);

      setEdges((eds) => {
        // Allow multiple connections; skip exact duplicate only
        const dup = eds.some(
          (e) => e.source === connection.source && e.target === connection.target
        );
        if (dup) return eds;

        return addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${eds.length}`,
            data: { crossCompany: cross },
            ...edgeStyle(cross),
          },
          eds
        );
      });
    },
    [getData, isValidConnection, setEdges]
  );

  const addAgent = (preset?: (typeof ROLE_PRESETS)[0]) => {
    if (nodes.length >= 12) return;
    const company = COMPANIES.find((c) => c.id === addCompanyId) || COMPANIES[0];
    const p = preset || ROLE_PRESETS[3];
    setNodes((nds) => [...nds, makeNode(p, company, nds.length)]);
  };

  const seedTwoCompanies = () => {
    const a = COMPANIES[0];
    const b = COMPANIES[1];
    const product = ROLE_PRESETS.find((r) => r.id === 'product')!;
    const finance = ROLE_PRESETS.find((r) => r.id === 'finance_ops')!;
    const research = ROLE_PRESETS.find((r) => r.id === 'research')!;
    const coder = ROLE_PRESETS.find((r) => r.id === 'coding')!;

    const n1 = makeNode(research, a, 0);
    n1.position = { x: 40, y: 80 };
    const n2 = makeNode(product, a, 1);
    n2.position = { x: 40, y: 240 };
    const n3 = makeNode(finance, b, 2);
    n3.position = { x: 420, y: 240 };
    const n4 = makeNode(coder, b, 3);
    n4.position = { x: 420, y: 80 };

    setNodes([n1, n2, n3, n4]);
    setEdges([
      {
        id: 'e-internal-a',
        source: n1.id,
        target: n2.id,
        data: { crossCompany: false },
        ...edgeStyle(false),
      },
      {
        id: 'e-cross',
        source: n2.id,
        target: n3.id,
        data: { crossCompany: true },
        ...edgeStyle(true),
      },
      {
        id: 'e-internal-b',
        source: n3.id,
        target: n4.id,
        data: { crossCompany: false },
        ...edgeStyle(false),
      },
    ]);
  };

  const updateSelected = (patch: Partial<AgentNodeData>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...(n.data as AgentNodeData), ...patch } } : n
      )
    );
  };

  const removeSelected = () => {
    if (!selectedId || nodes.length <= 1) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  const run = async () => {
    if (!task.trim()) return;
    setRunning(true);
    setError('');
    setLog([]);
    setOutcome('');
    try {
      const agents = nodes.map((n) => {
        const d = n.data as AgentNodeData;
        return {
          id: n.id,
          name: d.name,
          system: d.system,
          provider: d.provider,
          model: d.model,
          company: d.company,
          team: d.team,
          exposed: d.exposed,
        };
      });

      const graphEdges = edges.map((e) => ({
        from: e.source,
        to: e.target,
        crossCompany: !!(e.data as { crossCompany?: boolean })?.crossCompany,
      }));

      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents,
          edges: graphEdges,
          task,
          contextText: context,
          urls: urls
            .split('\n')
            .map((u) => u.trim())
            .filter((u) => u.startsWith('http')),
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
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900 shrink-0">
        <div className="px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-zinc-300">
              AgentForce
            </Link>
            <span className="text-[11px] text-zinc-600 hidden sm:inline">
              Multi-company teams · fan-out links
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <button type="button" onClick={() => setShowKeys((s) => !s)} className="hover:text-zinc-300">
              API keys
            </button>
            {session?.user?.email ? (
              <>
                <span className="text-zinc-600 hidden md:inline">{session.user.email}</span>
                <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="hover:text-zinc-300">
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className="hover:text-zinc-300">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {showKeys && (
        <div className="border-b border-zinc-900 px-4 py-3 shrink-0">
          <div className="max-w-3xl grid sm:grid-cols-3 gap-2">
            {(['xai', 'openai', 'anthropic'] as Provider[]).map((p) => (
              <input
                key={p}
                type="password"
                value={userKeys[p] || ''}
                onChange={(e) => saveKeys({ ...userKeys, [p]: e.target.value })}
                placeholder={`${p} api key`}
                className="h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none"
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="flex-1 min-h-[320px] relative border-b lg:border-b-0 lg:border-r border-zinc-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            connectionMode={ConnectionMode.Loose}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-[#0a0a0a]"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
            <Controls />
            <MiniMap
              nodeColor={(n) => (n.data as AgentNodeData)?.color || '#52525b'}
              maskColor="rgba(0,0,0,0.7)"
            />
          </ReactFlow>

          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/90 p-1.5 backdrop-blur">
              <select
                value={addCompanyId}
                onChange={(e) => setAddCompanyId(e.target.value)}
                className="text-[11px] bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1"
              >
                {COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {ROLE_PRESETS.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addAgent(r)}
                  className="text-[11px] px-2 py-1 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                >
                  + {r.name}
                </button>
              ))}
              <button
                type="button"
                onClick={seedTwoCompanies}
                className="text-[11px] px-2 py-1 rounded-md text-amber-500/90 hover:text-amber-400"
              >
                Demo: 2 companies
              </button>
              <button
                type="button"
                onClick={() => setEdges([])}
                className="text-[11px] px-2 py-1 rounded-md text-zinc-500"
              >
                Clear links
              </button>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 space-y-1">
            <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-1.5">
              {COMPANIES.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-[10px] text-amber-500/80">
                <span className="h-0.5 w-4 border-t border-dashed border-amber-500" />
                External link
              </span>
            </div>
            {connectHint && (
              <p className="text-[10px] text-amber-400 bg-zinc-950/90 border border-zinc-800 rounded px-2 py-1">
                {connectHint}
              </p>
            )}
          </div>
        </div>

        <aside className="w-full lg:w-[340px] shrink-0 flex flex-col max-h-[50vh] lg:max-h-none overflow-y-auto">
          <div className="p-4 space-y-4 border-b border-zinc-900">
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              placeholder="What should the companies / teams do?"
              className="w-full bg-transparent text-sm border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none resize-none"
            />
            <details>
              <summary className="text-[11px] text-zinc-600 cursor-pointer list-none">+ Context & connectors</summary>
              <div className="mt-2 space-y-2">
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={2}
                  placeholder="Shared notes..."
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none resize-none"
                />
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={2}
                  placeholder="URLs"
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none resize-none"
                />
                <label className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <input
                    type="checkbox"
                    checked={postOutcomeToSlack}
                    onChange={(e) => setPostOutcomeToSlack(e.target.checked)}
                  />
                  Slack outcome
                </label>
                <input
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="Slack webhook"
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none"
                />
                <input
                  value={genericWebhook}
                  onChange={(e) => setGenericWebhook(e.target.value)}
                  placeholder="Zapier webhook"
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none"
                />
              </div>
            </details>

            <button
              type="button"
              onClick={run}
              disabled={running || !task.trim()}
              className="w-full h-10 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30"
            >
              {running ? 'Running…' : 'Run graph'}
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <p className="text-[10px] text-zinc-600">
              One node can link to many. Cross-company links (dashed amber) only between{' '}
              <span className="text-amber-500">Ext</span> interfaces — e.g. Head of Product ↔ Financial Ops.
            </p>
          </div>

          {selected && (
            <div className="p-4 space-y-3 border-b border-zinc-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Selected</h3>
                <button type="button" onClick={removeSelected} className="text-[11px] text-zinc-600 hover:text-red-400">
                  Remove
                </button>
              </div>
              <input
                value={(selected.data as AgentNodeData).name}
                onChange={(e) => updateSelected({ name: e.target.value })}
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm border border-zinc-800 focus:outline-none"
              />
              <select
                value={(selected.data as AgentNodeData).company}
                onChange={(e) => {
                  const c = COMPANIES.find((x) => x.name === e.target.value);
                  updateSelected({
                    company: e.target.value,
                    color: c?.color || (selected.data as AgentNodeData).color,
                  });
                }}
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none"
              >
                {COMPANIES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={(selected.data as AgentNodeData).role}
                onChange={(e) => {
                  const preset = ROLE_PRESETS.find((r) => r.id === e.target.value);
                  if (preset) {
                    updateSelected({
                      role: preset.id,
                      name: preset.name,
                      system: preset.system,
                      team: preset.team,
                      exposed: preset.defaultExposed,
                    });
                  }
                }}
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none"
              >
                {ROLE_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.team}
                    {r.defaultExposed ? ' · Ext' : ''}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={(selected.data as AgentNodeData).exposed}
                  onChange={(e) => updateSelected({ exposed: e.target.checked })}
                />
                External interface (may link across companies)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={(selected.data as AgentNodeData).provider}
                  onChange={(e) => {
                    const provider = e.target.value as Provider;
                    updateSelected({ provider, model: MODELS[provider][0].id });
                  }}
                  className="bg-zinc-950 rounded-lg px-2 py-2 text-xs border border-zinc-800 focus:outline-none"
                >
                  <option value="xai">xAI</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <select
                  value={(selected.data as AgentNodeData).model}
                  onChange={(e) => updateSelected({ model: e.target.value })}
                  className="bg-zinc-950 rounded-lg px-2 py-2 text-xs border border-zinc-800 focus:outline-none"
                >
                  {MODELS[(selected.data as AgentNodeData).provider].map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={(selected.data as AgentNodeData).system}
                onChange={(e) => updateSelected({ system: e.target.value })}
                rows={4}
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none resize-none text-zinc-400"
              />
            </div>
          )}

          {(outcome || log.length > 0) && (
            <div className="p-4 space-y-4 flex-1">
              {outcome && (
                <div>
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Outcome</h3>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap">{outcome}</p>
                </div>
              )}
              {log.map((entry, i) => (
                <div key={entry.id || i}>
                  <div className="flex gap-2 text-[11px] mb-1">
                    <span className="text-zinc-500">{entry.agent}</span>
                    <span className="text-zinc-600">
                      {entry.provider} · {entry.model}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 whitespace-pre-wrap">{entry.output}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
