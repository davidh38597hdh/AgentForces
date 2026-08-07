'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserMenu, loadUserPrefs } from '@/components/UserMenu';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionMode,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import AgentNode, { type AgentNodeData } from './AgentNode';
import CompanyZoneNode, { type CompanyZoneData } from './CompanyZoneNode';
import { MeshLegend } from './MeshLegend';
import { buildProjectSeed, companiesFromSeedNodes } from '@/lib/seed-graph';
import { Logo } from '@/components/Logo';
import {
  CONNECTOR_TYPE_META,
  type ConnectorConfig,
  type ConnectorType,
  type ConnectorActionResult,
} from '@/lib/connectors/types';

type Provider = 'xai' | 'openai' | 'anthropic';
/** Bound provider or null = agnostic (not assigned yet) */
type KeyProvider = Provider | null;
type UserKeys = Partial<Record<Provider, string>>;

/** Global BYOK entry — starts provider-agnostic until the user binds one */
type GlobalApiKey = {
  id: string;
  name: string;
  /** null until user chooses xAI / Claude / OpenAI */
  provider: KeyProvider;
  key: string;
};
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

const KEYS_STORAGE = 'agentforces_user_keys_v1'; // legacy flat map
const GLOBAL_KEYS_STORAGE = 'agentforces_global_api_keys_v1';
const CONNECTORS_STORAGE = 'agentforces_connectors_v1';
const COMPANIES_STORAGE = 'agentforces_companies_v1';

const CONNECTOR_TYPES = Object.keys(CONNECTOR_TYPE_META) as ConnectorType[];

/** User-defined company. No product defaults — catalog starts empty. */
export type CompanyDef = {
  id: string;
  name: string;
  color: string;
};

const COMPANY_COLOR_PALETTE = [
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#22c55e',
  '#60a5fa',
  '#f97316',
  '#eab308',
  '#6366f1',
];

function newConnectorId(): string {
  return `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function newCompanyId(): string {
  return `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function nextCompanyColor(existing: CompanyDef[]): string {
  return COMPANY_COLOR_PALETTE[existing.length % COMPANY_COLOR_PALETTE.length];
}

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

/** Global provider choices (none selected by default on new key) */
const PROVIDER_KEY_OPTIONS: {
  id: Provider;
  label: string;
  short: string;
  placeholder: string;
  hint: string;
  accent: string;
}[] = [
  {
    id: 'xai',
    label: 'xAI (Grok)',
    short: 'xAI',
    placeholder: 'xai-…',
    hint: 'xAI console → API keys',
    accent: '#7c3aed',
  },
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    short: 'Claude',
    placeholder: 'sk-ant-…',
    hint: 'Anthropic console → API keys',
    accent: '#d97706',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    short: 'OpenAI',
    placeholder: 'sk-…',
    hint: 'OpenAI platform → API keys',
    accent: '#16a34a',
  },
];

function newApiKeyId(): string {
  return `key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function providerMeta(id: KeyProvider) {
  if (!id) return null;
  return PROVIDER_KEY_OPTIONS.find((p) => p.id === id) || null;
}

/** Map global key list → router bag (one key per provider; last bound wins) */
function globalKeysToUserBag(keys: GlobalApiKey[]): UserKeys {
  const bag: UserKeys = {};
  for (const entry of keys) {
    if (!entry.provider) continue;
    const k = entry.key.trim();
    if (!k) continue;
    bag[entry.provider] = k;
  }
  return bag;
}

const nodeTypes = { agent: AgentNode, companyZone: CompanyZoneNode };

const ZONE_PREFIX = 'zone-';
const COL_W = 340;
const ROW_H = 150;
const LANE_PAD_X = 28;
const LANE_PAD_Y = 48;

function companyByName(catalog: CompanyDef[], name: string) {
  return catalog.find((c) => c.name === name);
}

function companyById(catalog: CompanyDef[], id: string) {
  return catalog.find((c) => c.id === id);
}

/** Catalog + companies present on canvas (for switcher chips). No phantom defaults. */
function meshCompanies(catalog: CompanyDef[], agentNodes: Node[]): CompanyDef[] {
  const seen = new Map<string, CompanyDef>();
  for (const c of catalog) {
    if (c.name.trim()) seen.set(c.name, c);
  }
  for (const n of agentNodes) {
    if (n.id.startsWith(ZONE_PREFIX)) continue;
    const d = n.data as AgentNodeData;
    const name = (d?.company || '').trim();
    if (!name) continue;
    if (!seen.has(name)) {
      seen.set(name, {
        id: `from-node-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        color: d.color || '#71717a',
      });
    }
  }
  return Array.from(seen.values());
}

function makeNode(
  preset: (typeof ROLE_PRESETS)[0],
  company: CompanyDef | null,
  index: number,
  colIndex = 0
): Node {
  const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    type: 'agent',
    position: {
      x: 60 + colIndex * COL_W + (index % 2) * 40,
      y: 80 + Math.floor(index / 1) * ROW_H + (index % 3) * 12,
    },
    data: {
      name: preset.name,
      system: preset.system,
      provider: 'xai' as Provider,
      model: 'grok-3',
      role: preset.id,
      color: company?.color || preset.color,
      team: preset.team,
      company: company?.name || '',
      exposed: preset.defaultExposed,
      network: undefined,
    } satisfies AgentNodeData,
  };
}

function buildCompanyZoneNodes(
  agentNodes: Node[],
  catalog: CompanyDef[],
  focusCompanyId: string | 'all'
): Node[] {
  const agents = agentNodes.filter((n) => n.type === 'agent' || !n.type);
  const companies = meshCompanies(catalog, agents);
  const zones: Node[] = [];

  for (let col = 0; col < companies.length; col++) {
    const c = companies[col];
    const members = agents.filter((n) => (n.data as AgentNodeData).company === c.name);
    if (!members.length) continue;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of members) {
      const w = 220;
      const h = 120;
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    }

    const focused = focusCompanyId === 'all' || focusCompanyId === c.id;
    const width = Math.max(260, maxX - minX + LANE_PAD_X * 2);
    const height = Math.max(160, maxY - minY + LANE_PAD_Y + 24);

    zones.push({
      id: `${ZONE_PREFIX}${c.id}`,
      type: 'companyZone',
      position: { x: minX - LANE_PAD_X, y: minY - LANE_PAD_Y },
      draggable: false,
      selectable: false,
      focusable: false,
      connectable: false,
      zIndex: -1,
      style: { width, height },
      data: {
        name: c.name,
        color: c.color,
        agentCount: members.length,
        focused,
      } satisfies CompanyZoneData,
    });
  }
  return zones;
}

/** Inner helper: fit viewport when company focus / layout epoch changes (not on every drag). */
function CompanyFocusFit({
  focusCompanyId,
  agentNodes,
  catalog,
  fitEpoch,
}: {
  focusCompanyId: string | 'all';
  agentNodes: Node[];
  catalog: CompanyDef[];
  fitEpoch: number;
}) {
  const { fitView } = useReactFlow();
  const agentsRef = useRef(agentNodes);
  agentsRef.current = agentNodes;
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const skipFirst = useRef(true);

  useEffect(() => {
    // Avoid fighting initial fitView on first mount
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const agents = agentsRef.current.filter((n) => !n.id.startsWith(ZONE_PREFIX));
    if (!agents.length) return;

    if (focusCompanyId === 'all') {
      const t = window.setTimeout(() => {
        fitView({ padding: 0.22, duration: 320 });
      }, 50);
      return () => window.clearTimeout(t);
    }

    const company = companyById(catalogRef.current, focusCompanyId);
    const matchName = company?.name;
    const targets = agents.filter((n) => {
      const d = n.data as AgentNodeData;
      if (matchName) return d.company === matchName;
      return (
        companyByName(catalogRef.current, d.company)?.id === focusCompanyId ||
        d.company === focusCompanyId
      );
    });
    if (!targets.length) return;
    const t = window.setTimeout(() => {
      fitView({
        nodes: targets.map((n) => ({ id: n.id })),
        padding: 0.35,
        duration: 320,
      });
    }, 50);
    return () => window.clearTimeout(t);
  }, [focusCompanyId, fitView, fitEpoch]);

  return null;
}

function edgeStyle(crossCompany: boolean): Partial<Edge> {
  if (crossCompany) {
    return {
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#f59e0b' },
      label: 'external',
      labelStyle: { fill: '#b45309', fontSize: 10 },
      labelBgStyle: { fill: '#ffffff' },
    };
  }
  return {
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#71717a' },
  };
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-500 text-sm">
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
    makeNode(ROLE_PRESETS[3], null, 0),
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** User-defined companies only — starts empty */
  const [companies, setCompanies] = useState<CompanyDef[]>([]);
  const [addCompanyId, setAddCompanyId] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  /** Active company lens on the canvas: 'all' or company id */
  const [focusCompanyId, setFocusCompanyId] = useState<string | 'all'>('all');
  const [showCompanyLanes, setShowCompanyLanes] = useState(true);
  /** Bumps when layout should re-fit (e.g. arrange by company) */
  const [fitEpoch, setFitEpoch] = useState(0);
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [urls, setUrls] = useState('');
  /** Global API keys — empty by default; entries start provider-agnostic */
  const [globalKeys, setGlobalKeys] = useState<GlobalApiKey[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [revealKeys, setRevealKeys] = useState(false);

  useEffect(() => {
    const prefs = loadUserPrefs();
    if (prefs.revealKeysByDefault) setRevealKeys(true);
  }, []);

  const userKeys = useMemo(() => globalKeysToUserBag(globalKeys), [globalKeys]);
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
  const [libraryTab, setLibraryTab] = useState<'agents' | 'companies' | 'providers'>('agents');
  const [inspectorTab, setInspectorTab] = useState<'configure' | 'run'>('configure');

  useEffect(() => {
    // Global API keys: never seed defaults. Only restore user-added entries with content.
    try {
      const raw = localStorage.getItem(GLOBAL_KEYS_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as GlobalApiKey[];
        if (Array.isArray(parsed)) {
          const restored = parsed
            .filter((k) => k && typeof k.id === 'string')
            .map((k) => ({
              id: k.id,
              name: typeof k.name === 'string' ? k.name : '',
              provider:
                k.provider === 'xai' || k.provider === 'openai' || k.provider === 'anthropic'
                  ? k.provider
                  : null,
              key: typeof k.key === 'string' ? k.key : '',
            }))
            // Drop empty stubs (no secret) so the catalog stays empty until real keys are added
            .filter((k) => k.key.trim().length > 0);
          setGlobalKeys(restored);
          try {
            localStorage.setItem(GLOBAL_KEYS_STORAGE, JSON.stringify(restored));
            localStorage.setItem(KEYS_STORAGE, JSON.stringify(globalKeysToUserBag(restored)));
          } catch {}
        }
      } else {
        // Explicit empty catalog — do not migrate legacy flat keys (avoids reintroducing "defaults")
        setGlobalKeys([]);
        try {
          localStorage.setItem(GLOBAL_KEYS_STORAGE, JSON.stringify([]));
          localStorage.removeItem(KEYS_STORAGE);
        } catch {}
      }
    } catch {
      setGlobalKeys([]);
    }
    try {
      const raw = localStorage.getItem(CONNECTORS_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as ConnectorConfig[];
        if (Array.isArray(parsed)) setConnectors(parsed);
      }
    } catch {}
    try {
      const raw = localStorage.getItem(COMPANIES_STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as CompanyDef[];
        if (Array.isArray(parsed)) {
          // Never re-hydrate hard-coded demo brands; only user-shaped entries
          // Strip former product defaults if still in older localStorage
          const legacyNames = new Set(['acme corp', 'nova labs', 'orbit systems']);
          const cleaned = parsed
            .filter(
              (c) =>
                c &&
                typeof c.id === 'string' &&
                typeof c.name === 'string' &&
                c.name.trim() &&
                typeof c.color === 'string' &&
                !legacyNames.has(c.name.trim().toLowerCase())
            )
            .map((c) => ({
              id: c.id,
              name: c.name.trim(),
              color: c.color || nextCompanyColor([]),
            }));
          setCompanies(cleaned);
          if (cleaned[0]) setAddCompanyId(cleaned[0].id);
        }
      }
    } catch {}
  }, []);

  const persistCompanies = useCallback((next: CompanyDef[]) => {
    setCompanies(next);
    try {
      localStorage.setItem(COMPANIES_STORAGE, JSON.stringify(next));
    } catch {}
  }, []);

  const persistConnectors = useCallback((next: ConnectorConfig[]) => {
    setConnectors(next);
    try {
      localStorage.setItem(CONNECTORS_STORAGE, JSON.stringify(next));
    } catch {}
  }, []);

  const createCompany = useCallback(
    (nameRaw: string, color?: string): CompanyDef | null => {
      const name = nameRaw.trim();
      if (!name) return null;
      if (companies.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        setError('A company with that name already exists');
        return null;
      }
      const entry: CompanyDef = {
        id: newCompanyId(),
        name,
        color: color || nextCompanyColor(companies),
      };
      persistCompanies([...companies, entry]);
      setAddCompanyId(entry.id);
      setError('');
      return entry;
    },
    [companies, persistCompanies]
  );

  const removeCompany = useCallback(
    (id: string) => {
      const victim = companies.find((c) => c.id === id);
      const next = companies.filter((c) => c.id !== id);
      persistCompanies(next);
      if (addCompanyId === id) setAddCompanyId(next[0]?.id || null);
      if (focusCompanyId === id) setFocusCompanyId('all');
      if (victim) {
        setNodes((nds) =>
          nds.map((n) => {
            const d = n.data as AgentNodeData;
            if (d.company !== victim.name) return n;
            return {
              ...n,
              data: { ...d, company: '', color: d.color },
            };
          })
        );
      }
    },
    [companies, persistCompanies, addCompanyId, focusCompanyId, setNodes]
  );

  const mergeCompaniesFromSeed = useCallback(
    (seedNodes: Node[]) => {
      const found = companiesFromSeedNodes(seedNodes);
      if (!found.length) return;
      setCompanies((prev) => {
        let next = [...prev];
        for (const f of found) {
          if (next.some((c) => c.name.toLowerCase() === f.name.toLowerCase())) continue;
          next.push({
            id: newCompanyId(),
            name: f.name,
            color: f.color,
          });
        }
        try {
          localStorage.setItem(COMPANIES_STORAGE, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

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
      mergeCompaniesFromSeed(seeded.nodes);
    } catch {
      /* keep defaults */
    }
    setSeedApplied(true);
  }, [searchParams, seedApplied, setNodes, setEdges, mergeCompaniesFromSeed]);

  const persistGlobalKeys = useCallback((next: GlobalApiKey[]) => {
    setGlobalKeys(next);
    try {
      localStorage.setItem(GLOBAL_KEYS_STORAGE, JSON.stringify(next));
      const bag = globalKeysToUserBag(next);
      if (Object.keys(bag).length) {
        localStorage.setItem(KEYS_STORAGE, JSON.stringify(bag));
      } else {
        localStorage.removeItem(KEYS_STORAGE);
      }
    } catch {}
  }, []);

  const keysConfiguredCount = useMemo(
    () => globalKeys.filter((k) => k.provider && k.key.trim()).length,
    [globalKeys]
  );

  const addGlobalApiKey = () => {
    const n = globalKeys.length + 1;
    const entry: GlobalApiKey = {
      id: newApiKeyId(),
      name: n === 1 ? 'API key' : `API key ${n}`,
      provider: null, // agnostic until user chooses
      key: '',
    };
    persistGlobalKeys([...globalKeys, entry]);
  };

  const updateGlobalApiKey = (id: string, patch: Partial<GlobalApiKey>) => {
    persistGlobalKeys(
      globalKeys.map((k) => (k.id === id ? { ...k, ...patch } : k))
    );
  };

  const removeGlobalApiKey = (id: string) => {
    persistGlobalKeys(globalKeys.filter((k) => k.id !== id));
  };

  const agentNodes = useMemo(
    () => nodes.filter((n) => !n.id.startsWith(ZONE_PREFIX)),
    [nodes]
  );

  const companiesOnMesh = useMemo(
    () => meshCompanies(companies, agentNodes),
    [companies, agentNodes]
  );

  const companyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of agentNodes) {
      const name = (n.data as AgentNodeData).company?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return counts;
  }, [agentNodes]);

  const selected = useMemo(
    () => agentNodes.find((n) => n.id === selectedId) || null,
    [agentNodes, selectedId]
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

  /** Nodes rendered on canvas: company zones under agents, with focus dimming. */
  const displayNodes = useMemo(() => {
    const focusName =
      focusCompanyId === 'all'
        ? null
        : companyById(companies, focusCompanyId)?.name || null;

    const decorated = agentNodes.map((n) => {
      const d = n.data as AgentNodeData;
      const matches =
        focusCompanyId === 'all' ||
        d.company === focusName ||
        companyByName(companies, d.company)?.id === focusCompanyId;
      return {
        ...n,
        zIndex: matches ? 10 : 2,
        data: {
          ...d,
          companyFocused: matches,
        } satisfies AgentNodeData,
      };
    });

    if (!showCompanyLanes) return decorated;
    const zones = buildCompanyZoneNodes(agentNodes, companies, focusCompanyId);
    return [...zones, ...decorated];
  }, [agentNodes, companies, focusCompanyId, showCompanyLanes]);

  const displayEdges = useMemo(() => {
    if (focusCompanyId === 'all') return edges;
    const focusName = companyById(companies, focusCompanyId)?.name;
    const focusedIds = new Set(
      agentNodes
        .filter((n) => {
          const d = n.data as AgentNodeData;
          return (
            d.company === focusName ||
            companyByName(companies, d.company)?.id === focusCompanyId
          );
        })
        .map((n) => n.id)
    );
    return edges.map((e) => {
      const involved = focusedIds.has(e.source) || focusedIds.has(e.target);
      return {
        ...e,
        style: {
          ...(e.style || {}),
          opacity: involved ? 1 : 0.15,
        },
        animated: involved ? e.animated : false,
      };
    });
  }, [edges, focusCompanyId, agentNodes, companies]);

  const getData = useCallback(
    (id: string) => agentNodes.find((n) => n.id === id)?.data as AgentNodeData | undefined,
    [agentNodes]
  );

  const onNodesChangeSafe = useCallback(
    (changes: NodeChange[]) => {
      // Never apply zone node changes into agent state
      onNodesChange(changes.filter((c) => !('id' in c && c.id?.startsWith(ZONE_PREFIX))));
    },
    [onNodesChange]
  );

  const switchCompanyFocus = useCallback(
    (id: string | 'all') => {
      setFocusCompanyId(id);
      if (id !== 'all') {
        const c = companyById(companies, id);
        if (c) setAddCompanyId(c.id);
      }
    },
    [companies]
  );

  const assignSelectedToCompany = useCallback(
    (company: CompanyDef | null) => {
      if (!company) {
        if (selectedId) {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id !== selectedId) return n;
              const d = n.data as AgentNodeData;
              return { ...n, data: { ...d, company: '' } };
            })
          );
        }
        setAddCompanyId(null);
        setFocusCompanyId('all');
        return;
      }
      if (!selectedId) {
        setAddCompanyId(company.id);
        switchCompanyFocus(company.id);
        return;
      }
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedId) return n;
          const d = n.data as AgentNodeData;
          return {
            ...n,
            data: { ...d, company: company.name, color: company.color },
          };
        })
      );
      setAddCompanyId(company.id);
      switchCompanyFocus(company.id);
    },
    [selectedId, setNodes, switchCompanyFocus]
  );

  const arrangeByCompany = useCallback(() => {
    const order = meshCompanies(companies, agentNodes);
    if (!order.length) {
      setError('Create companies first (Library → Companies), then arrange.');
      return;
    }

    setNodes((nds) => {
      const agents = nds.filter((n) => !n.id.startsWith(ZONE_PREFIX));
      const colIndex = new Map(order.map((c, i) => [c.name, i]));
      const rowInCol = new Map<string, number>();

      return agents.map((n) => {
        const d = n.data as AgentNodeData;
        const key = d.company?.trim() || '';
        const col = key ? colIndex.get(key) ?? order.length : order.length;
        const row = rowInCol.get(key) || 0;
        rowInCol.set(key, row + 1);
        return {
          ...n,
          position: {
            x: 60 + col * COL_W,
            y: 90 + row * ROW_H,
          },
        };
      });
    });
    // Re-fit viewport to current company lens after column layout
    window.setTimeout(() => setFitEpoch((e) => e + 1), 30);
  }, [agentNodes, companies, setNodes]);

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
    if (agentNodes.length >= 12) return;
    const company = addCompanyId ? companyById(companies, addCompanyId) || null : null;
    const p = preset || ROLE_PRESETS[3];
    const col = company ? Math.max(0, companies.findIndex((c) => c.id === company.id)) : 0;
    setNodes((nds) => {
      const agents = nds.filter((n) => !n.id.startsWith(ZONE_PREFIX));
      return [...agents, makeNode(p, company, agents.length, col)];
    });
    if (company) setFocusCompanyId(company.id);
  };

  const seedTwoCompanies = () => {
    // Create ephemeral demo orgs only when the user asks — not product defaults
    let a = companies[0];
    let b = companies[1];
    let catalog = companies;
    if (!a || !b) {
      const created: CompanyDef[] = [...companies];
      if (!a) {
        a = {
          id: newCompanyId(),
          name: 'Company A',
          color: nextCompanyColor(created),
        };
        created.push(a);
      }
      if (!b || b.id === a.id) {
        b = {
          id: newCompanyId(),
          name: companies.some((c) => c.name === 'Company B') ? 'Company C' : 'Company B',
          color: nextCompanyColor(created),
        };
        created.push(b);
      }
      catalog = created;
      persistCompanies(created);
    }

    const product = ROLE_PRESETS.find((r) => r.id === 'product')!;
    const finance = ROLE_PRESETS.find((r) => r.id === 'finance_ops')!;
    const research = ROLE_PRESETS.find((r) => r.id === 'research')!;
    const coder = ROLE_PRESETS.find((r) => r.id === 'coding')!;

    const n1 = makeNode(research, a, 0, 0);
    n1.position = { x: 40, y: 80 };
    const n2 = makeNode(product, a, 1, 0);
    n2.position = { x: 40, y: 240 };
    const n3 = makeNode(finance, b, 2, 1);
    n3.position = { x: 420, y: 240 };
    const n4 = makeNode(coder, b, 3, 1);
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
    setAddCompanyId(a.id);
    setFocusCompanyId('all');
    setFitEpoch((e) => e + 1);
    void catalog;
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
    if (!selectedId || agentNodes.length <= 1) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId && !n.id.startsWith(ZONE_PREFIX)));
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
      const agents = agentNodes.map((n) => {
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
    <div className="af-app h-screen flex flex-col bg-zinc-50 text-zinc-900">
      <header className="af-app-header border-b border-zinc-200 bg-white shrink-0">
        <div className="px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
              <Logo size={22} />
              AgentForces
            </Link>
            {meshSession && (
              <span className="text-[10px] text-indigo-400/90 hidden md:inline font-mono">
                {meshSession.protocol} · {meshSession.epochId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => {
                setShowKeys((s) => !s);
                setShowConnectors(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                showKeys
                  ? 'border-violet-500/40 bg-violet-500/10 text-zinc-900'
                  : 'border-zinc-200 text-zinc-400 hover:text-zinc-800 hover:border-zinc-300'
              }`}
              title="Bring-your-own-key for model providers"
            >
              <span className="font-medium">API keys</span>
              <span
                className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-md ${
                  keysConfiguredCount > 0
                    ? 'bg-emerald-500/15 text-emerald-700'
                    : 'bg-zinc-100 text-zinc-500'
                }`}
                title={
                  globalKeys.length
                    ? `${keysConfiguredCount} ready · ${globalKeys.length} total (incl. agnostic)`
                    : 'No global API keys'
                }
              >
                {globalKeys.length === 0
                  ? '0'
                  : `${keysConfiguredCount}/${globalKeys.length}`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConnectors((s) => !s);
                setShowKeys(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                showConnectors
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-zinc-900'
                  : 'border-zinc-200 text-zinc-400 hover:text-zinc-800 hover:border-zinc-300'
              }`}
            >
              Connectors
              {connectors.length > 0 && (
                <span className="text-[10px] tabular-nums text-zinc-500">{connectors.length}</span>
              )}
            </button>
            <UserMenu
              email={session?.user?.email}
              name={session?.user?.name}
              image={session?.user?.image}
              onOpenApiKeys={() => {
                setShowKeys(true);
                setShowConnectors(false);
              }}
              onOpenConnectors={() => {
                setShowConnectors(true);
                setShowKeys(false);
              }}
              onPrefsChange={(p) => {
                if (typeof p.revealKeysByDefault === 'boolean') {
                  setRevealKeys(p.revealKeysByDefault);
                }
              }}
            />
          </div>
        </div>
      </header>

      {showKeys && (
        <div className="border-b border-zinc-200 bg-white shrink-0 max-h-[50vh] overflow-y-auto">
          <div className="px-4 py-3 max-w-3xl mx-auto space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
                  Global API keys
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xl leading-relaxed">
                  No keys by default. Add a key as provider-agnostic, then bind it to{' '}
                  <span className="text-zinc-700">xAI</span>,{' '}
                  <span className="text-zinc-700">Claude</span>, or{' '}
                  <span className="text-zinc-700">OpenAI</span>. Stored only in this browser.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revealKeys}
                    onChange={(e) => setRevealKeys(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  Show keys
                </label>
                <button
                  type="button"
                  onClick={addGlobalApiKey}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500"
                >
                  + Add API key
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeys(false)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded-md border border-zinc-200"
                >
                  Close
                </button>
              </div>
            </div>

            {globalKeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
                <p className="text-sm text-zinc-700 font-medium">No global API keys</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Nothing is set up by default. Add a key when you need one — start provider-agnostic,
                  then bind xAI, Claude, or OpenAI.
                </p>
                <button
                  type="button"
                  onClick={addGlobalApiKey}
                  className="mt-4 h-9 px-4 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-500"
                >
                  Add API key
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {globalKeys.map((entry) => {
                  const meta = providerMeta(entry.provider);
                  const ready = Boolean(entry.provider && entry.key.trim());
                  return (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 space-y-2"
                      style={
                        meta
                          ? { boxShadow: `inset 3px 0 0 ${meta.accent}` }
                          : { boxShadow: 'inset 3px 0 0 #a1a1aa' }
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={entry.name}
                          onChange={(e) =>
                            updateGlobalApiKey(entry.id, { name: e.target.value })
                          }
                          placeholder="Label (optional)"
                          className="h-8 min-w-[8rem] flex-1 px-2.5 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-violet-400"
                        />
                        <select
                          value={entry.provider || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateGlobalApiKey(entry.id, {
                              provider:
                                v === 'xai' || v === 'openai' || v === 'anthropic' ? v : null,
                            });
                          }}
                          className="h-8 px-2 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-800 focus:outline-none min-w-[10rem]"
                        >
                          <option value="">Provider: not set (agnostic)</option>
                          {PROVIDER_KEY_OPTIONS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <span
                          className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                            ready
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.provider
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {!entry.provider
                            ? 'Agnostic'
                            : ready
                              ? 'Ready'
                              : 'Needs key'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeGlobalApiKey(entry.id)}
                          className="text-[10px] text-zinc-500 hover:text-red-500 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                      <label className="sr-only" htmlFor={`gkey-${entry.id}`}>
                        API key secret
                      </label>
                      <input
                        id={`gkey-${entry.id}`}
                        type={revealKeys ? 'text' : 'password'}
                        autoComplete="off"
                        spellCheck={false}
                        value={entry.key}
                        onChange={(e) =>
                          updateGlobalApiKey(entry.id, { key: e.target.value })
                        }
                        placeholder={
                          meta?.placeholder || 'Paste API key… (provider optional for now)'
                        }
                        className="w-full h-9 px-3 rounded-lg bg-white border border-zinc-200 text-xs font-mono text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400"
                      />
                      <p className="text-[10px] text-zinc-500">
                        {meta
                          ? meta.hint
                          : 'Choose a provider above to bind this key for mesh runs.'}
                        {entry.key.trim()
                          ? ` · ${entry.key.trim().length} chars stored`
                          : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Mesh runs use a bound key for each agent’s provider. Unbound (agnostic) entries are
              ignored until you select xAI, Claude, or OpenAI. Never commit keys.
            </p>
          </div>
        </div>
      )}

      {showConnectors && (
        <div className="border-b border-zinc-200 px-4 py-3 shrink-0 max-h-[42vh] overflow-y-auto">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Connectors
                </p>
                <p className="text-[10px] text-zinc-500">
                  BYOK Slack / Gmail / webhooks · stored only in this browser · assign per agent
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectors(false)}
                className="text-[11px] text-zinc-500 hover:text-zinc-700"
              >
                Close
              </button>
            </div>

            {connectors.length > 0 && (
              <ul className="space-y-2">
                {connectors.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-800 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-500">
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
                      className="text-[10px] text-zinc-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Add connector</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={newConnectorType}
                  onChange={(e) => {
                    setNewConnectorType(e.target.value as ConnectorType);
                    setNewConnectorFields({});
                  }}
                  className="h-9 px-2 rounded-lg bg-white border border-zinc-200 text-xs"
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
                  className="h-9 px-3 rounded-lg bg-white border border-zinc-200 text-xs focus:outline-none"
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
                  className="w-full h-9 px-3 rounded-lg bg-white border border-zinc-200 text-xs focus:outline-none"
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
                className="h-9 px-3 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-500"
              >
                Save connector
              </button>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
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
          className={`shrink-0 border-r border-zinc-200 bg-white/90 flex flex-col transition-[width] duration-200 ease-out overflow-hidden ${
            libraryOpen ? 'w-[260px]' : 'w-0 border-r-0'
          }`}
        >
          <div className="w-[260px] h-full flex flex-col min-h-0">
            <div className="px-3 py-3 border-b border-zinc-200 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
                  Library
                </p>
                <p className="text-[10px] text-zinc-500">Agents · companies · providers</p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="text-zinc-500 hover:text-zinc-800 text-xs px-1.5 py-1 rounded border border-zinc-200"
                title="Hide library"
              >
                ‹
              </button>
            </div>

            {/* Tab strip — agents default; companies & providers tucked away */}
            <div className="px-2 pt-2 border-b border-zinc-200">
              <div
                className="flex rounded-lg border border-zinc-200 p-0.5 gap-0.5"
                role="tablist"
                aria-label="Library sections"
              >
                {(
                  [
                    { id: 'agents' as const, label: 'Agents' },
                    { id: 'companies' as const, label: 'Companies' },
                    { id: 'providers' as const, label: 'Providers' },
                  ] as const
                ).map((tab) => {
                  const active = libraryTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setLibraryTab(tab.id)}
                      className={`flex-1 px-1.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                        active
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {libraryTab === 'agents' && (
              <div className="p-3 border-b border-zinc-200">
                <input
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Search agents…"
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-zinc-200 text-xs focus:outline-none focus:border-violet-500/40"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3">
              {libraryTab === 'agents' && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Core agents
                    {addCompanyId && companyById(companies, addCompanyId) ? (
                      <span className="ml-1.5 normal-case tracking-normal font-normal text-zinc-500">
                        · adds to{' '}
                        <span
                          style={{ color: companyById(companies, addCompanyId)!.color }}
                        >
                          {companyById(companies, addCompanyId)!.name}
                        </span>
                      </span>
                    ) : (
                      <span className="ml-1.5 normal-case tracking-normal font-normal text-zinc-500">
                        · no company
                      </span>
                    )}
                  </p>
                  {filteredPresets.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => addAgent(r)}
                      className="w-full text-left rounded-lg border border-zinc-200 bg-zinc-50 hover:border-violet-500/40 hover:bg-zinc-100 px-2.5 py-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="text-xs font-medium text-zinc-800">{r.name}</span>
                        {r.defaultExposed && (
                          <span className="ml-auto text-[9px] text-amber-500/80 border border-amber-500/30 rounded px-1">
                            Ext
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 pl-4 truncate">{r.team}</p>
                    </button>
                  ))}
                  {filteredPresets.length === 0 && (
                    <p className="text-[11px] text-zinc-500 px-1">No agents match.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setLibraryTab('companies')}
                    className="w-full mt-3 text-[10px] text-zinc-500 hover:text-zinc-400 text-left px-1"
                  >
                    {companies.length ? 'Manage companies →' : 'Create companies →'}
                  </button>
                </div>
              )}

              {libraryTab === 'companies' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                      Your companies
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mb-2">
                      No presets — add the orgs you field. Optional default for new agents.
                    </p>
                    <div className="flex gap-1.5 mb-3">
                      <input
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const created = createCompany(newCompanyName);
                            if (created) setNewCompanyName('');
                          }
                        }}
                        placeholder="New company name"
                        className="flex-1 h-8 px-2.5 rounded-lg bg-white border border-zinc-200 text-xs focus:outline-none focus:border-violet-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const created = createCompany(newCompanyName);
                          if (created) setNewCompanyName('');
                        }}
                        className="h-8 px-2.5 rounded-lg bg-violet-600 text-white text-[11px] font-medium shrink-0 hover:bg-violet-500"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAddCompanyId(null);
                          setFocusCompanyId('all');
                        }}
                        className={`w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          !addCompanyId
                            ? 'border-white/25 bg-zinc-100'
                            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                        }`}
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-zinc-600" />
                        <span className="text-[11px] text-zinc-800 flex-1">No company</span>
                        {!addCompanyId && (
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wide">
                            default
                          </span>
                        )}
                      </button>
                      {companies.map((c) => {
                        const active = addCompanyId === c.id;
                        const count = companyCounts.get(c.name) || 0;
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center gap-1 rounded-lg border px-1 py-1 ${
                              active
                                ? 'border-white/25 bg-zinc-100'
                                : 'border-zinc-200 bg-zinc-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setAddCompanyId(c.id);
                                switchCompanyFocus(c.id);
                              }}
                              className="flex-1 flex items-center gap-2 px-1.5 py-1.5 text-left min-w-0"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="text-[11px] text-zinc-800 flex-1 truncate">
                                {c.name}
                              </span>
                              <span className="text-[10px] text-zinc-500 tabular-nums">
                                {count}
                              </span>
                              {active && (
                                <span className="text-[9px] text-zinc-500 uppercase tracking-wide">
                                  default
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCompany(c.id)}
                              className="text-[10px] text-zinc-500 hover:text-red-400 px-1.5 py-1 shrink-0"
                              title="Remove company"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      {companies.length === 0 && (
                        <p className="text-[11px] text-zinc-500 px-1 py-2">
                          Empty catalog. Add a company to assign agents and show lanes.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLibraryTab('agents')}
                    className="text-[10px] text-violet-400/90 hover:text-violet-300"
                  >
                    ← Back to agents
                  </button>
                </div>
              )}

              {libraryTab === 'providers' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                      Model providers
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mb-2">
                      Global keys start agnostic; bind to xAI, Claude, or OpenAI when ready.
                    </p>
                    <ul className="space-y-1.5">
                      {PROVIDER_KEY_OPTIONS.map((p) => {
                        const hasKey = Boolean(userKeys[p.id]?.trim());
                        return (
                          <li
                            key={p.id}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-zinc-200 text-[11px] text-zinc-600 bg-zinc-50"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: hasKey ? p.accent : '#a1a1aa',
                              }}
                            />
                            <span className="text-zinc-800 flex-1 truncate">{p.label}</span>
                            <span className="text-zinc-500">{MODELS[p.id].length} models</span>
                            <span className="text-[9px] text-zinc-500">
                              {hasKey ? 'key set' : 'no key'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[10px] text-zinc-500 mt-2">
                      {globalKeys.filter((k) => !k.provider).length > 0
                        ? `${globalKeys.filter((k) => !k.provider).length} agnostic key(s) not bound yet.`
                        : 'Add keys from the header — no defaults.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowKeys(true);
                      setShowConnectors(false);
                    }}
                    className="w-full h-8 rounded-lg border border-zinc-200 text-[11px] text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
                  >
                    Open global API keys
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryTab('agents')}
                    className="text-[10px] text-violet-600 hover:text-violet-700"
                  >
                    ← Back to agents
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {!libraryOpen && (
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 rounded-r-lg border border-l-0 border-zinc-300 bg-white/95 px-1.5 py-3 text-[10px] text-zinc-400 hover:text-violet-300 writing-mode-vertical"
            style={{ writingMode: 'vertical-rl' }}
            title="Show agent library"
          >
            Agent library
          </button>
        )}

        {/* —— Center: canvas —— */}
        <div className="flex-1 min-w-0 min-h-0 relative">
          <ReactFlowProvider>
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              onNodesChange={onNodesChangeSafe}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              connectionMode={ConnectionMode.Loose}
              onNodeClick={(_, n) => {
                if (n.id.startsWith(ZONE_PREFIX)) return;
                setSelectedId(n.id);
                const d = n.data as AgentNodeData;
                const c = companyByName(companies, d.company);
                if (c) setAddCompanyId(c.id);
              }}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-slate-50"
              nodesDraggable
              elementsSelectable
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d8" />
              <Controls />
              <MiniMap
                nodeColor={(n) => {
                  if (n.id.startsWith(ZONE_PREFIX)) {
                    return (n.data as CompanyZoneData)?.color || '#27272a';
                  }
                  return (n.data as AgentNodeData)?.color || '#52525b';
                }}
                maskColor="rgba(244,244,245,0.7)"
                pannable
                zoomable
              />
              <CompanyFocusFit
                focusCompanyId={focusCompanyId}
                agentNodes={agentNodes}
                catalog={companies}
                fitEpoch={fitEpoch}
              />

              {/* Canvas actions — top; legends live bottom-left */}
              <Panel position="top-center" className="!m-3">
                <div className="flex flex-wrap items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white/95 p-1 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setShowCompanyLanes((v) => !v)}
                    className={`text-[11px] px-2 py-1 rounded-md border border-zinc-200 ${
                      showCompanyLanes ? 'text-violet-700' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {showCompanyLanes ? 'Lanes on' : 'Lanes off'}
                  </button>
                  <button
                    type="button"
                    onClick={seedTwoCompanies}
                    className="text-[11px] px-2 py-1 rounded-md text-amber-700 hover:text-amber-800"
                  >
                    Demo: 2 orgs
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdges([])}
                    className="text-[11px] px-2 py-1 rounded-md text-zinc-500 hover:text-zinc-700"
                  >
                    Clear links
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryOpen((o) => !o)}
                    className="text-[11px] px-2 py-1 rounded-md text-zinc-600 hover:text-violet-700 border border-zinc-200"
                  >
                    {libraryOpen ? 'Hide library' : 'Library'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorOpen((o) => !o)}
                    className="text-[11px] px-2 py-1 rounded-md text-zinc-600 hover:text-cyan-700 border border-zinc-200"
                  >
                    {inspectorOpen ? 'Collapse inspector' : 'Expand inspector'}
                  </button>
                </div>
              </Panel>

            </ReactFlow>
          </ReactFlowProvider>
        </div>


        {/* —— Right rail: inspector body (collapsible) + mesh legend footer (always) —— */}
        <aside className="w-[300px] shrink-0 border-l border-zinc-200 bg-white flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex rounded-lg border border-zinc-200 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setInspectorOpen(true);
                  setInspectorTab('configure');
                }}
                className={`px-2.5 py-1 rounded-md ${
                  inspectorOpen && inspectorTab === 'configure'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Configure
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectorOpen(true);
                  setInspectorTab('run');
                }}
                className={`px-2.5 py-1 rounded-md ${
                  inspectorOpen && inspectorTab === 'run'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Run
              </button>
            </div>
            <button
              type="button"
              onClick={() => setInspectorOpen((o) => !o)}
              className="text-zinc-500 hover:text-zinc-800 text-xs px-1.5 py-1 rounded border border-zinc-200"
              title={inspectorOpen ? 'Collapse inspector body' : 'Expand inspector body'}
            >
              {inspectorOpen ? '▾' : '▴'}
            </button>
          </div>

          {inspectorOpen ? (
            <div className="flex-1 overflow-y-auto min-h-0">
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
                        className="text-[11px] text-zinc-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {!selected && (
                    <p className="text-xs text-zinc-500 leading-relaxed">
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
                        className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-zinc-200 focus:outline-none focus:border-violet-500/40"
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
                        className="w-full bg-white rounded-lg px-3 py-2 text-xs border border-zinc-200 focus:outline-none"
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
                        className="w-full bg-white rounded-lg px-3 py-2 text-xs border border-zinc-200 focus:outline-none font-mono"
                      />

                      {/* Company & provider tucked behind disclosures */}
                      <details className="group rounded-lg border border-zinc-200 bg-zinc-50 open:bg-white">
                        <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-800">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: (selected.data as AgentNodeData).color,
                            }}
                          />
                          <span className="flex-1 truncate">
                            Company ·{' '}
                            <span className="text-zinc-700">
                              {(selected.data as AgentNodeData).company?.trim() ||
                                'none'}
                            </span>
                          </span>
                          <span className="text-[10px] text-zinc-500 group-open:hidden">Open</span>
                          <span className="text-[10px] text-zinc-500 hidden group-open:inline">
                            Close
                          </span>
                        </summary>
                        <div className="px-2 pb-2 space-y-1.5 border-t border-zinc-200 pt-2">
                          <button
                            type="button"
                            onClick={() => assignSelectedToCompany(null)}
                            className={`w-full flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                              !(selected.data as AgentNodeData).company?.trim()
                                ? 'border-white/25 bg-zinc-100 text-zinc-900'
                                : 'border-zinc-200 text-zinc-400 hover:text-zinc-800'
                            }`}
                          >
                            <span className="h-2 w-2 rounded-full shrink-0 bg-zinc-600" />
                            No company
                          </button>
                          {companies.map((c) => {
                            const current =
                              (selected.data as AgentNodeData).company === c.name;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => assignSelectedToCompany(c)}
                                className={`w-full flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                                  current
                                    ? 'border-white/25 bg-zinc-100 text-zinc-900'
                                    : 'border-zinc-200 text-zinc-400 hover:text-zinc-800'
                                }`}
                              >
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: c.color }}
                                />
                                {c.name}
                              </button>
                            );
                          })}
                          {companies.length === 0 && (
                            <p className="text-[10px] text-zinc-500 px-1">
                              Create companies in Library → Companies first.
                            </p>
                          )}
                        </div>
                      </details>

                      <details className="group rounded-lg border border-zinc-200 bg-zinc-50 open:bg-white">
                        <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-800">
                          <span className="flex-1 truncate">
                            Provider ·{' '}
                            <span className="text-zinc-700">
                              {(selected.data as AgentNodeData).provider} /{' '}
                              {(selected.data as AgentNodeData).model}
                            </span>
                          </span>
                          <span className="text-[10px] text-zinc-500 group-open:hidden">Open</span>
                          <span className="text-[10px] text-zinc-500 hidden group-open:inline">
                            Close
                          </span>
                        </summary>
                        <div className="px-2 pb-2 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-2">
                          <select
                            value={(selected.data as AgentNodeData).provider}
                            onChange={(e) => {
                              const provider = e.target.value as Provider;
                              updateSelected({ provider, model: MODELS[provider][0].id });
                            }}
                            className="bg-white rounded-lg px-2 py-2 text-xs border border-zinc-200 focus:outline-none"
                          >
                            <option value="xai">xAI</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                          </select>
                          <select
                            value={(selected.data as AgentNodeData).model}
                            onChange={(e) => updateSelected({ model: e.target.value })}
                            className="bg-white rounded-lg px-2 py-2 text-xs border border-zinc-200 focus:outline-none"
                          >
                            {MODELS[(selected.data as AgentNodeData).provider].map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </details>
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        System prompt
                      </label>
                      <textarea
                        value={(selected.data as AgentNodeData).system}
                        onChange={(e) => updateSelected({ system: e.target.value })}
                        rows={6}
                        className="w-full bg-white rounded-lg px-3 py-2 text-xs border border-zinc-200 focus:outline-none resize-none text-zinc-400"
                      />
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider">
                        Connector tools
                      </label>
                      {connectors.length === 0 ? (
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
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
                                    <span className="text-zinc-800">{c.name}</span>
                                    <span className="block text-[10px] text-zinc-500">
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
                    className="w-full bg-transparent text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none resize-none"
                  />
                  <details>
                    <summary className="text-[11px] text-zinc-500 cursor-pointer list-none">
                      + Context & URLs
                    </summary>
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        rows={2}
                        placeholder="Shared notes..."
                        className="w-full bg-white rounded-lg px-3 py-2 text-xs border border-zinc-200 focus:outline-none resize-none"
                      />
                      <textarea
                        value={urls}
                        onChange={(e) => setUrls(e.target.value)}
                        rows={2}
                        placeholder="URLs"
                        className="w-full bg-white rounded-lg px-3 py-2 text-xs border border-zinc-200 focus:outline-none resize-none"
                      />
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
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
                    className="w-full h-10 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-30 hover:bg-violet-500"
                  >
                    {running ? 'Running mesh…' : 'Run mesh'}
                  </button>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <p className="text-[10px] text-zinc-500">
                    Chief routes the primary network; inter-network hops use the bus. Dashed amber =
                    Ext only.
                  </p>

                  {(outcome || log.length > 0 || hops.length > 0) && (
                    <div className="space-y-4 pt-2 border-t border-zinc-200">
                      {meshSession && (
                        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-violet-400/90">
                            Mesh session
                          </p>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            {meshSession.protocol} · {meshSession.transport}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono truncate">
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
                              Chief → <span className="text-zinc-800">{primaryNetwork}</span>
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
                                className="text-[10px] text-zinc-500 border-l-2 border-zinc-200 pl-2"
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
                                <span className="text-zinc-500">{h.msgType}</span>
                                <span className="block text-zinc-500">{h.note}</span>
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
                          <p className="text-xs text-zinc-700 whitespace-pre-wrap">{outcome}</p>
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
                                className="text-[10px] border-l-2 pl-2 border-zinc-200"
                              >
                                <span className={a.ok ? 'text-emerald-500/90' : 'text-red-400'}>
                                  {a.ok ? 'ok' : 'fail'}
                                </span>{' '}
                                <span className="text-zinc-400">{a.connectorName}</span>{' '}
                                <span className="text-zinc-500">{a.action}</span>
                                <span className="block text-zinc-500">{a.detail}</span>
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
                            <span className="text-zinc-500">
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
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 px-4 py-6 bg-zinc-50/50">
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                Agent configure / run is collapsed.
              </p>
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-white"
              >
                Expand inspector
              </button>
            </div>
          )}

          {/* Mesh legend — permanent footer of the inspector rail */}
          <div className="shrink-0">
            <MeshLegend
              agentCount={agentNodes.length}
              companiesOnMesh={companiesOnMesh}
              companies={companies}
              companyCounts={companyCounts}
              focusCompanyId={focusCompanyId}
              onFocusCompany={switchCompanyFocus}
              selectedName={
                selected ? (selected.data as AgentNodeData).name : null
              }
              selectedCompany={
                selected ? (selected.data as AgentNodeData).company : undefined
              }
              onAssignCompany={assignSelectedToCompany}
              onArrangeByCompany={arrangeByCompany}
              connectHint={connectHint}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
