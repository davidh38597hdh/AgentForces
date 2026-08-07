'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { buildProjectSeed } from '@/lib/seed-graph';
import { Logo } from '@/components/Logo';
import {
  CONNECTOR_TYPE_META,
  type ConnectorConfig,
  type ConnectorType,
  type ConnectorActionResult,
} from '@/lib/connectors/types';

type Provider = 'xai' | 'openai' | 'anthropic';
type UserKeys = Partial<Record<Provider, string>>;
type LogEntry = {
  id: string;
  agent: string;
  provider: string;
  model: string;
  output: string;
  network?: string;
  connectorActions?: ConnectorActionResult[];
};
type HopEntry = {
  messageId: string;
  from: string;
  to: string;
  msgType: string;
  boundary: string;
  sealed: boolean;
  note: string;
};
type SessionMeta = {
  protocol: string;
  epochId: string;
  sessionId: string;
  chiefHandle: string;
  transport: string;
};
type SecurityMeta = {
  meshTransport?: string;
  sealedHops?: boolean;
  note?: string;
};

const KEYS_STORAGE = 'agentforces_user_keys_v1';
const CONNECTORS_STORAGE = 'agentforces_connectors_v1';

const CONNECTOR_TYPES = Object.keys(CONNECTOR_TYPE_META) as ConnectorType[];

function newConnectorId(): string {
  return `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

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
      network: undefined,
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

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-500 text-sm">
          Loading mesh…
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
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
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [showConnectors, setShowConnectors] = useState(false);
  const [newConnectorType, setNewConnectorType] = useState<ConnectorType>('slack_webhook');
  const [newConnectorName, setNewConnectorName] = useState('');
  const [newConnectorFields, setNewConnectorFields] = useState<Record<string, string>>({});
  const [newNotifyOnComplete, setNewNotifyOnComplete] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [hops, setHops] = useState<HopEntry[]>([]);
  const [meshSession, setMeshSession] = useState<SessionMeta | null>(null);
  const [securityMeta, setSecurityMeta] = useState<SecurityMeta | null>(null);
  const [primaryNetwork, setPrimaryNetwork] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');
  const [connectorActions, setConnectorActions] = useState<ConnectorActionResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [connectHint, setConnectHint] = useState('');
  const [seedApplied, setSeedApplied] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [inspectorTab, setInspectorTab] = useState<'configure' | 'run'>('configure');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS_STORAGE);
      if (raw) setUserKeys(JSON.parse(raw));
    } catch {}
    try {
      const raw = localStorage.getItem(CONNECTORS_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as ConnectorConfig[];
        if (Array.isArray(parsed)) setConnectors(parsed);
      }
    } catch {}
  }, []);

  const persistConnectors = useCallback((next: ConnectorConfig[]) => {
    setConnectors(next);
    try {
      localStorage.setItem(CONNECTORS_STORAGE, JSON.stringify(next));
    } catch {}
  }, []);

  const addConnector = () => {
    const meta = CONNECTOR_TYPE_META[newConnectorType];
    const name =
      newConnectorName.trim() ||
      `${meta.label} ${connectors.filter((c) => c.type === newConnectorType).length + 1}`;
    const config: Record<string, string> = {};
    for (const f of meta.fields) {
      const v = (newConnectorFields[f.key] || '').trim();
      if (v) config[f.key] = v;
    }
    // Require at least one secret/primary field
    const primary = meta.fields[0];
    if (!config[primary.key]) {
      setError(`Connector needs ${primary.label}`);
      return;
    }
    const entry: ConnectorConfig = {
      id: newConnectorId(),
      type: newConnectorType,
      name,
      config,
      notifyOnComplete: newNotifyOnComplete,
    };
    persistConnectors([...connectors, entry]);
    setNewConnectorName('');
    setNewConnectorFields({});
    setNewNotifyOnComplete(false);
    setError('');
  };

  const removeConnector = (id: string) => {
    persistConnectors(connectors.filter((c) => c.id !== id));
    // Drop allowlist refs from agents
    setNodes((nds) =>
      nds.map((n) => {
        const d = n.data as AgentNodeData;
        if (!d.connectorIds?.includes(id)) return n;
        return {
          ...n,
          data: {
            ...d,
            connectorIds: d.connectorIds.filter((x) => x !== id),
          },
        };
      })
    );
  };

  const toggleConnectorNotify = (id: string) => {
    persistConnectors(
      connectors.map((c) =>
        c.id === id ? { ...c, notifyOnComplete: !c.notifyOnComplete } : c
      )
    );
  };

  const toggleAgentConnector = (connectorId: string) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedId) return n;
        const d = n.data as AgentNodeData;
        const cur = d.connectorIds || [];
        const next = cur.includes(connectorId)
          ? cur.filter((x) => x !== connectorId)
          : [...cur, connectorId];
        return {
          ...n,
          data: { ...d, connectorIds: next.length ? next : undefined },
        };
      })
    );
  };

  // Open right inspector when an agent is selected
  useEffect(() => {
    if (selectedId) {
      setInspectorOpen(true);
      setInspectorTab('configure');
    }
  }, [selectedId]);

  // Portal → dashboard: apply project seed once
  useEffect(() => {
    if (seedApplied) return;
    const project = searchParams.get('project');
    if (!project) {
      setSeedApplied(true);
      return;
    }
    try {
      const seeded = buildProjectSeed(project);
      setNodes(seeded.nodes);
      setEdges(seeded.edges);
      if (seeded.task) setTask(seeded.task);
    } catch {
      /* keep defaults */
    }
    setSeedApplied(true);
  }, [searchParams, seedApplied, setNodes, setEdges]);

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

  const filteredPresets = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return ROLE_PRESETS;
    return ROLE_PRESETS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.team.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }, [libraryQuery]);

  const getData = useCallback(
    (id: string) => nodes.find((n) => n.id === id)?.data as AgentNodeData | undefined,
    [nodes]
  );

  /** Allow many edges; block cross-company / inter-network unless both exposed */
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target || source === target) return false;

      const s = getData(source);
      const t = getData(target);
      if (!s || !t) return false;

      const crossCompany = s.company !== t.company;
      const interNetwork =
        !!(s.network && t.network && s.network !== t.network) || crossCompany;
      if (interNetwork && !(s.exposed && t.exposed)) {
        setConnectHint(
          'Cross-company / inter-network links require both nodes to be External (Ext) interfaces.'
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
      const crossCompany = !!(s && t && s.company !== t.company);
      const interNetwork =
        !!(s?.network && t?.network && s.network !== t.network) || crossCompany;

      setEdges((eds) => {
        const dup = eds.some(
          (e) => e.source === connection.source && e.target === connection.target
        );
        if (dup) return eds;

        return addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${eds.length}`,
            data: { crossCompany, interNetwork },
            ...edgeStyle(interNetwork),
            ...(interNetwork && !crossCompany ? { label: 'inter-net' } : {}),
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
    setHops([]);
    setMeshSession(null);
    setSecurityMeta(null);
    setPrimaryNetwork(null);
    setOutcome('');
    setConnectorActions([]);
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
          network: d.network,
          exposed: d.exposed,
          connectorIds: d.connectorIds,
        };
      });

      const graphEdges = edges.map((e) => {
        const data = (e.data || {}) as { crossCompany?: boolean; interNetwork?: boolean };
        return {
          from: e.source,
          to: e.target,
          crossCompany: !!data.crossCompany,
          interNetwork: !!data.interNetwork,
        };
      });

      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents,
          edges: graphEdges,
          task,
          contextText: context,
          chiefRoute: true,
          urls: urls
            .split('\n')
            .map((u) => u.trim())
            .filter((u) => u.startsWith('http')),
          userKeys: {
            xai: userKeys.xai || undefined,
            openai: userKeys.openai || undefined,
            anthropic: userKeys.anthropic || undefined,
          },
          connectors,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLog(data.log || []);
      setHops(data.hops || []);
      setMeshSession(data.session || null);
      setSecurityMeta(data.security || null);
      setPrimaryNetwork(data.primaryNetwork || null);
      setOutcome(data.outcome || data.final || '');
      setConnectorActions(data.connectorActions || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Run failed';
      if (msg.includes('401') || msg.toLowerCase().includes('authentication')) {
        setError('Sign in required to run the mesh.');
      } else {
        setError(msg);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900 shrink-0">
        <div className="px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200">
              <Logo size={22} />
              AgentForces
            </Link>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Force canvas · boundaries · AMEP/1 · BYOK
            </span>
            {meshSession && (
              <span className="text-[10px] text-indigo-400/90 hidden md:inline font-mono">
                {meshSession.protocol} · {meshSession.epochId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <button type="button" onClick={() => setShowKeys((s) => !s)} className="hover:text-zinc-300">
              API keys
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConnectors((s) => !s);
                setShowKeys(false);
              }}
              className="hover:text-zinc-300"
            >
              Connectors{connectors.length > 0 ? ` (${connectors.length})` : ''}
            </button>
            {session?.user?.email ? (
              <>
                <span className="text-zinc-600 hidden md:inline">{session.user.email}</span>
                <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="hover:text-zinc-300">
                  Sign out
                </button>
              </>
            ) : (
              <span className="text-zinc-600">Guest</span>
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

      {showConnectors && (
        <div className="border-b border-zinc-900 px-4 py-3 shrink-0 max-h-[42vh] overflow-y-auto">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Connectors
                </p>
                <p className="text-[10px] text-zinc-600">
                  BYOK Slack / Gmail / webhooks · stored only in this browser · assign per agent
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectors(false)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Close
              </button>
            </div>

            {connectors.length > 0 && (
              <ul className="space-y-2">
                {connectors.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-600">
                        {CONNECTOR_TYPE_META[c.type].label}
                        {c.notifyOnComplete ? ' · notify on complete' : ''}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <input
                        type="checkbox"
                        checked={!!c.notifyOnComplete}
                        onChange={() => toggleConnectorNotify(c.id)}
                      />
                      Auto-notify
                    </label>
                    <button
                      type="button"
                      onClick={() => removeConnector(c.id)}
                      className="text-[10px] text-zinc-600 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-lg border border-zinc-800 bg-black/40 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Add connector</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={newConnectorType}
                  onChange={(e) => {
                    setNewConnectorType(e.target.value as ConnectorType);
                    setNewConnectorFields({});
                  }}
                  className="h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                >
                  {CONNECTOR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CONNECTOR_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
                <input
                  value={newConnectorName}
                  onChange={(e) => setNewConnectorName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none"
                />
              </div>
              {CONNECTOR_TYPE_META[newConnectorType].fields.map((f) => (
                <input
                  key={f.key}
                  type={f.secret ? 'password' : 'text'}
                  value={newConnectorFields[f.key] || ''}
                  onChange={(e) =>
                    setNewConnectorFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  placeholder={f.placeholder || f.label}
                  className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none"
                />
              ))}
              <label className="flex items-center gap-2 text-[11px] text-zinc-500">
                <input
                  type="checkbox"
                  checked={newNotifyOnComplete}
                  onChange={(e) => setNewNotifyOnComplete(e.target.checked)}
                />
                Notify with mesh outcome when run completes
              </label>
              <button
                type="button"
                onClick={addConnector}
                className="h-9 px-3 rounded-lg bg-white text-black text-xs font-medium"
              >
                Save connector
              </button>
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                Gmail needs an{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400/90 hover:underline"
                >
                  app password
                </a>
                . Slack: Incoming Webhook URL or bot token (xoxb-…). Webhooks must be https.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex relative">
        {/* —— Left: Agent library (toggle) —— */}
        <aside
          className={`shrink-0 border-r border-zinc-800/80 bg-black/80 flex flex-col transition-[width] duration-200 ease-out overflow-hidden ${
            libraryOpen ? 'w-[260px]' : 'w-0 border-r-0'
          }`}
        >
          <div className="w-[260px] h-full flex flex-col min-h-0">
            <div className="px-3 py-3 border-b border-zinc-800/80 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Agent library
                </p>
                <p className="text-[10px] text-zinc-600">Drag-ready roles · click to add</p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 text-xs px-1.5 py-1 rounded border border-zinc-800"
                title="Hide library"
              >
                ‹
              </button>
            </div>
            <div className="p-3 border-b border-zinc-800/60">
              <input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Search agents…"
                className="w-full h-8 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-violet-500/40"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Core agents
                </p>
                <div className="space-y-1.5">
                  {filteredPresets.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => addAgent(r)}
                      className="w-full text-left rounded-lg border border-zinc-800/80 bg-zinc-950/60 hover:border-violet-500/40 hover:bg-zinc-900/80 px-2.5 py-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="text-xs font-medium text-zinc-200">{r.name}</span>
                        {r.defaultExposed && (
                          <span className="ml-auto text-[9px] text-amber-500/80 border border-amber-500/30 rounded px-1">
                            Ext
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-0.5 pl-4 truncate">{r.team}</p>
                    </button>
                  ))}
                  {filteredPresets.length === 0 && (
                    <p className="text-[11px] text-zinc-600 px-1">No agents match.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Providers
                </p>
                <ul className="space-y-1">
                  {(
                    [
                      { id: 'xai', label: 'xAI', models: MODELS.xai.length },
                      { id: 'openai', label: 'OpenAI', models: MODELS.openai.length },
                      { id: 'anthropic', label: 'Anthropic', models: MODELS.anthropic.length },
                    ] as const
                  ).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 text-[11px] text-zinc-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                      {p.label}
                      <span className="ml-auto text-zinc-600">{p.models} models</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Company for new agents
                </p>
                <select
                  value={addCompanyId}
                  onChange={(e) => setAddCompanyId(e.target.value)}
                  className="w-full text-[11px] bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2"
                >
                  {COMPANIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </aside>

        {!libraryOpen && (
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 rounded-r-lg border border-l-0 border-zinc-700 bg-zinc-950/95 px-1.5 py-3 text-[10px] text-zinc-400 hover:text-violet-300 writing-mode-vertical"
            style={{ writingMode: 'vertical-rl' }}
            title="Show agent library"
          >
            Agent library
          </button>
        )}

        {/* —— Center: canvas —— */}
        <div className="flex-1 min-w-0 min-h-0 relative">
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
            className="bg-[#000000]"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1c1c1e" />
            <Controls />
            <MiniMap
              nodeColor={(n) => (n.data as AgentNodeData)?.color || '#52525b'}
              maskColor="rgba(0,0,0,0.75)"
            />
          </ReactFlow>

          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none justify-center">
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-black/90 p-1.5 backdrop-blur">
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
                className="text-[11px] px-2 py-1 rounded-md text-zinc-500 hover:text-zinc-300"
              >
                Clear links
              </button>
              <button
                type="button"
                onClick={() => setLibraryOpen((o) => !o)}
                className="text-[11px] px-2 py-1 rounded-md text-zinc-400 hover:text-violet-300 border border-zinc-800"
              >
                {libraryOpen ? 'Hide library' : 'Library'}
              </button>
              <button
                type="button"
                onClick={() => setInspectorOpen((o) => !o)}
                className="text-[11px] px-2 py-1 rounded-md text-zinc-400 hover:text-cyan-300 border border-zinc-800"
              >
                {inspectorOpen ? 'Hide inspector' : 'Inspector'}
              </button>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 space-y-1">
            <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-black/90 px-2.5 py-1.5">
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
              <p className="text-[10px] text-amber-400 bg-black/90 border border-zinc-800 rounded px-2 py-1">
                {connectHint}
              </p>
            )}
          </div>
        </div>

        {!inspectorOpen && (
          <button
            type="button"
            onClick={() => setInspectorOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 rounded-l-lg border border-r-0 border-zinc-700 bg-zinc-950/95 px-1.5 py-3 text-[10px] text-zinc-400 hover:text-cyan-300"
            style={{ writingMode: 'vertical-rl' }}
            title="Show agent inspector"
          >
            Inspector
          </button>
        )}

        {/* —— Right: Agent customization (toggle) —— */}
        <aside
          className={`shrink-0 border-l border-zinc-800/80 bg-black/80 flex flex-col transition-[width] duration-200 ease-out overflow-hidden ${
            inspectorOpen ? 'w-[320px]' : 'w-0 border-l-0'
          }`}
        >
          <div className="w-[320px] h-full flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex rounded-lg border border-zinc-800 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInspectorTab('configure')}
                  className={`px-2.5 py-1 rounded-md ${
                    inspectorTab === 'configure'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('run')}
                  className={`px-2.5 py-1 rounded-md ${
                    inspectorTab === 'run'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Run
                </button>
              </div>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 text-xs px-1.5 py-1 rounded border border-zinc-800"
                title="Hide inspector"
              >
                ›
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {inspectorTab === 'configure' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {selected ? 'Selected agent' : 'No agent selected'}
                    </h3>
                    {selected && (
                      <button
                        type="button"
                        onClick={removeSelected}
                        className="text-[11px] text-zinc-600 hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {!selected && (
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Click a node on the canvas, or add one from the Agent library.
                    </p>
                  )}

                  {selected && (
                    <>
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        Agent name
                      </label>
                      <input
                        value={(selected.data as AgentNodeData).name}
                        onChange={(e) => updateSelected({ name: e.target.value })}
                        className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm border border-zinc-800 focus:outline-none focus:border-violet-500/40"
                      />
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        Role
                      </label>
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
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        Company
                      </label>
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
                      <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={(selected.data as AgentNodeData).exposed}
                          onChange={(e) => updateSelected({ exposed: e.target.checked })}
                        />
                        External interface (cross-company / inter-network)
                      </label>
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        Network id
                      </label>
                      <input
                        value={(selected.data as AgentNodeData).network || ''}
                        onChange={(e) =>
                          updateSelected({
                            network: e.target.value.trim() || undefined,
                          })
                        }
                        placeholder="research | computation | creative"
                        className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none font-mono"
                      />
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        Provider · model
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
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        System prompt
                      </label>
                      <textarea
                        value={(selected.data as AgentNodeData).system}
                        onChange={(e) => updateSelected({ system: e.target.value })}
                        rows={6}
                        className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-xs border border-zinc-800 focus:outline-none resize-none text-zinc-400"
                      />
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        Connector tools
                      </label>
                      {connectors.length === 0 ? (
                        <p className="text-[11px] text-zinc-600 leading-relaxed">
                          No connectors yet.{' '}
                          <button
                            type="button"
                            onClick={() => setShowConnectors(true)}
                            className="text-cyan-500/90 hover:underline"
                          >
                            Add Slack, Gmail, or webhooks
                          </button>{' '}
                          then allowlist them here so this agent can call them mid-run.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {connectors.map((c) => {
                            const checked = (
                              (selected.data as AgentNodeData).connectorIds || []
                            ).includes(c.id);
                            return (
                              <li key={c.id}>
                                <label className="flex items-start gap-2 text-[11px] text-zinc-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={checked}
                                    onChange={() => toggleAgentConnector(c.id)}
                                  />
                                  <span>
                                    <span className="text-zinc-200">{c.name}</span>
                                    <span className="block text-[10px] text-zinc-600">
                                      {CONNECTOR_TYPE_META[c.type].label}
                                    </span>
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}

              {inspectorTab === 'run' && (
                <div className="p-4 space-y-4">
                  <textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    rows={3}
                    placeholder="Task for the mesh (chief routes by keywords: research / calc / write…)"
                    className="w-full bg-transparent text-sm border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none resize-none"
                  />
                  <details>
                    <summary className="text-[11px] text-zinc-600 cursor-pointer list-none">
                      + Context & URLs
                    </summary>
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
                      <p className="text-[10px] text-zinc-600 leading-relaxed">
                        Outbound actions: header →{' '}
                        <button
                          type="button"
                          onClick={() => setShowConnectors(true)}
                          className="text-cyan-500/90 hover:underline"
                        >
                          Connectors
                        </button>
                        , then assign per agent under Configure. Connectors with “auto-notify”
                        fire after the run.
                      </p>
                    </div>
                  </details>

                  <button
                    type="button"
                    onClick={run}
                    disabled={running || !task.trim()}
                    className="w-full h-10 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30"
                  >
                    {running ? 'Running mesh…' : 'Run mesh'}
                  </button>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <p className="text-[10px] text-zinc-600">
                    Chief routes the primary network; inter-network hops use the bus. Dashed amber =
                    Ext only.
                  </p>

                  {(outcome || log.length > 0 || hops.length > 0) && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                      {meshSession && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-violet-400/90">
                            Mesh session
                          </p>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            {meshSession.protocol} · {meshSession.transport}
                          </p>
                          <p className="text-[10px] text-zinc-600 font-mono truncate">
                            epoch {meshSession.epochId}
                          </p>
                          {(securityMeta?.note || meshSession.transport === 'in_memory') && (
                            <p className="text-[10px] text-amber-500/80 mt-1">
                              {securityMeta?.note ||
                                'Mesh hops not AEAD-sealed yet (metadata only).'}
                            </p>
                          )}
                          {primaryNetwork && (
                            <p className="text-[11px] text-zinc-400">
                              Chief → <span className="text-zinc-200">{primaryNetwork}</span>
                            </p>
                          )}
                        </div>
                      )}
                      {hops.length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                            Bus hops
                          </h3>
                          <ul className="space-y-1.5">
                            {hops.map((h) => (
                              <li
                                key={h.messageId}
                                className="text-[10px] text-zinc-500 border-l-2 border-zinc-800 pl-2"
                              >
                                <span
                                  className={
                                    h.boundary === 'inter' || h.boundary === 'chief'
                                      ? 'text-amber-500/90'
                                      : 'text-zinc-400'
                                  }
                                >
                                  [{h.boundary}]
                                </span>{' '}
                                {h.from} → {h.to}{' '}
                                <span className="text-zinc-600">{h.msgType}</span>
                                <span className="block text-zinc-600">{h.note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {outcome && (
                        <div>
                          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                            Outcome
                          </h3>
                          <p className="text-xs text-zinc-300 whitespace-pre-wrap">{outcome}</p>
                        </div>
                      )}
                      {connectorActions.length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                            Connector actions
                          </h3>
                          <ul className="space-y-1.5">
                            {connectorActions.map((a, i) => (
                              <li
                                key={`${a.connectorId}-${a.action}-${i}`}
                                className="text-[10px] border-l-2 pl-2 border-zinc-800"
                              >
                                <span className={a.ok ? 'text-emerald-500/90' : 'text-red-400'}>
                                  {a.ok ? 'ok' : 'fail'}
                                </span>{' '}
                                <span className="text-zinc-400">{a.connectorName}</span>{' '}
                                <span className="text-zinc-600">{a.action}</span>
                                <span className="block text-zinc-600">{a.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {log.map((entry, i) => (
                        <div key={entry.id || i}>
                          <div className="flex flex-wrap gap-2 text-[11px] mb-1">
                            <span className="text-zinc-500">{entry.agent}</span>
                            {entry.network && (
                              <span className="text-violet-400/80">net:{entry.network}</span>
                            )}
                            <span className="text-zinc-600">
                              {entry.provider} · {entry.model}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 whitespace-pre-wrap">{entry.output}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
