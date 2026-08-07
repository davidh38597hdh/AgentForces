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

const ROLE_PRESETS: {
  id: string;
  name: string;
  system: string;
  color: string;
  team: string;
}[] = [
  {
    id: 'research',
    name: 'Researcher',
    system: 'You are a research agent. Gather facts, structure findings, and surface important insights.',
    color: '#3b82f6',
    team: 'Intel',
  },
  {
    id: 'coding',
    name: 'Coder',
    system: 'You are a senior software engineer. Write clear code and practical implementation steps.',
    color: '#22c55e',
    team: 'Build',
  },
  {
    id: 'finance',
    name: 'Financial Analyst',
    system: 'You are a financial analyst. Focus on numbers, assumptions, risks, and realistic projections.',
    color: '#eab308',
    team: 'Finance',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    system: 'You are an analytical agent. Extract patterns and concrete next steps.',
    color: '#a855f7',
    team: 'Intel',
  },
  {
    id: 'writer',
    name: 'Writer',
    system: 'You are a clear writer. Turn analysis into structured readable content.',
    color: '#ec4899',
    team: 'Content',
  },
  {
    id: 'critic',
    name: 'Critic',
    system: 'You are a sharp critic. Challenge assumptions and suggest stronger alternatives.',
    color: '#f97316',
    team: 'QA',
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

function makeNode(preset: (typeof ROLE_PRESETS)[0], index: number): Node {
  const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    type: 'agent',
    position: { x: 80 + (index % 3) * 260, y: 80 + Math.floor(index / 3) * 140 },
    data: {
      name: preset.name,
      system: preset.system,
      provider: 'xai' as Provider,
      model: 'grok-3',
      role: preset.id,
      color: preset.color,
      team: preset.team,
    } satisfies AgentNodeData,
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([makeNode(ROLE_PRESETS[0], 0)]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#71717a' },
            style: { stroke: '#52525b', strokeWidth: 1.5 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addAgent = (preset?: (typeof ROLE_PRESETS)[0]) => {
    if (nodes.length >= 8) return;
    const p = preset || ROLE_PRESETS[0];
    setNodes((nds) => [...nds, makeNode(p, nds.length)]);
  };

  const updateSelected = (patch: Partial<AgentNodeData>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? { ...n, data: { ...(n.data as AgentNodeData), ...patch } }
          : n
      )
    );
  };

  const removeSelected = () => {
    if (!selectedId || nodes.length <= 1) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  const chainLinear = () => {
    const ordered = [...nodes].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
    const next: Edge[] = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      next.push({
        id: `e-${ordered[i].id}-${ordered[i + 1].id}`,
        source: ordered[i].id,
        target: ordered[i + 1].id,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#71717a' },
        style: { stroke: '#52525b', strokeWidth: 1.5 },
      });
    }
    setEdges(next);
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
        };
      });
      const graphEdges = edges.map((e) => ({ from: e.source, to: e.target }));

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

  const teamLegend = useMemo(() => {
    const map = new Map<string, string>();
    ROLE_PRESETS.forEach((r) => map.set(r.team, r.color));
    return Array.from(map.entries());
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900 shrink-0">
        <div className="px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-zinc-300">
              AgentForce
            </Link>
            <span className="text-[11px] text-zinc-600 hidden sm:inline">2D team graph</span>
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
                className="h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex-1 min-h-[320px] relative border-b lg:border-b-0 lg:border-r border-zinc-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
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

          {/* Canvas toolbar */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/90 p-1.5 backdrop-blur">
              {ROLE_PRESETS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addAgent(r)}
                  className="text-[11px] px-2 py-1 rounded-md border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200"
                  style={{ borderLeftColor: r.color, borderLeftWidth: 2 }}
                >
                  + {r.name}
                </button>
              ))}
              <button
                type="button"
                onClick={chainLinear}
                className="text-[11px] px-2 py-1 rounded-md text-zinc-500 hover:text-zinc-300"
              >
                Chain
              </button>
              <button
                type="button"
                onClick={() => setEdges([])}
                className="text-[11px] px-2 py-1 rounded-md text-zinc-500 hover:text-zinc-300"
              >
                Clear links
              </button>
            </div>
          </div>

          {/* Team legend */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-1.5 backdrop-blur">
            {teamLegend.map(([team, color]) => (
              <span key={team} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {team}
              </span>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <aside className="w-full lg:w-[340px] shrink-0 flex flex-col max-h-[50vh] lg:max-h-none overflow-y-auto">
          <div className="p-4 space-y-4 border-b border-zinc-900">
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              placeholder="What should the team do?"
              className="w-full bg-transparent text-sm border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600 resize-none"
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
                  placeholder="URLs (one per line)"
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
                  placeholder="Slack webhook URL"
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none"
                />
                <input
                  value={genericWebhook}
                  onChange={(e) => setGenericWebhook(e.target.value)}
                  placeholder="Zapier / generic webhook"
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none"
                />
              </div>
            </details>

            <button
              type="button"
              onClick={run}
              disabled={running || !task.trim() || nodes.length === 0}
              className="w-full h-10 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30"
            >
              {running ? 'Running graph…' : 'Run team'}
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Selected node editor */}
          {selected && (
            <div className="p-4 space-y-3 border-b border-zinc-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Selected agent</h3>
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
                value={(selected.data as AgentNodeData).role}
                onChange={(e) => {
                  const preset = ROLE_PRESETS.find((r) => r.id === e.target.value);
                  if (preset) {
                    updateSelected({
                      role: preset.id,
                      name: preset.name,
                      system: preset.system,
                      color: preset.color,
                      team: preset.team,
                    });
                  }
                }}
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none"
              >
                {ROLE_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.team})
                  </option>
                ))}
              </select>
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
              <p className="text-[10px] text-zinc-600">
                Drag nodes on the canvas. Connect by dragging from the right handle to another node&apos;s left handle.
              </p>
            </div>
          )}

          {/* Results */}
          {(outcome || log.length > 0) && (
            <div className="p-4 space-y-4 flex-1">
              {outcome && (
                <div>
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Outcome</h3>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{outcome}</p>
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
