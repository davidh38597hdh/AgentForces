import type { Edge, Node } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

type Provider = 'xai' | 'openai' | 'anthropic';

export type SeedAgentData = {
  name: string;
  system: string;
  provider: Provider;
  model: string;
  role: string;
  color: string;
  team: string;
  /** Empty unless the seed needs multi-org boundaries — no product default catalog. */
  company: string;
  exposed: boolean;
  /** Orchestrate network id (research | computation | creative | …) */
  network?: string;
};

function edgeStyle(crossCompany: boolean): Partial<Edge> {
  if (crossCompany) {
    return {
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#f59e0b' },
      label: 'external',
      labelStyle: { fill: '#f59e0b', fontSize: 10 },
      labelBgStyle: { fill: '#ffffff' },
    };
  }
  return {
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#52525b', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#71717a' },
  };
}

function node(id: string, x: number, y: number, data: SeedAgentData): Node {
  return { id, type: 'agent', position: { x, y }, data };
}

function role(
  partial: Omit<SeedAgentData, 'provider' | 'model' | 'color' | 'company'> & {
    color?: string;
    company?: string;
  }
): SeedAgentData {
  return {
    provider: 'xai',
    model: 'grok-3',
    color: partial.color || '#71717a',
    company: partial.company ?? '',
    ...partial,
  };
}

/** Collect unique non-empty companies from seed nodes (for dashboard catalog import). */
export function companiesFromSeedNodes(nodes: Node[]): { name: string; color: string }[] {
  const seen = new Map<string, string>();
  for (const n of nodes) {
    const d = n.data as SeedAgentData;
    const name = (d?.company || '').trim();
    if (!name || seen.has(name)) continue;
    seen.set(name, d.color || '#71717a');
  }
  return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
}

export function buildProjectSeed(seed: string): {
  nodes: Node[];
  edges: Edge[];
  task: string;
} {
  // Orchestrate + AMEP concept: three networks — no company catalog defaults
  if (seed === 'orchestrate') {
    const nSup = node(
      'orch-research-sup',
      40,
      60,
      role({
        name: 'Research Supervisor',
        role: 'research-supervisor',
        team: 'Research Network',
        color: '#3b82f6',
        network: 'research',
        exposed: true,
        system:
          'You supervise the Research Network. Break down questions, synthesize findings, and hand off quantitative work to Computation or writing to Creative via inter-network briefs.',
      })
    );
    const nRes = node(
      'orch-researcher',
      40,
      220,
      role({
        name: 'Researcher',
        role: 'researcher',
        team: 'Research Network',
        color: '#60a5fa',
        network: 'research',
        exposed: false,
        system:
          'You gather information and extract key facts for the Research Network. Concise bullets.',
      })
    );
    const nComp = node(
      'orch-compute',
      380,
      140,
      role({
        name: 'Compute Lead',
        role: 'compute-lead',
        team: 'Computation Network',
        color: '#22c55e',
        network: 'computation',
        exposed: true,
        system:
          'You lead the Computation Network. Solve quantitative problems with clear assumptions and numeric answers. Accept research briefs; return partner-safe results.',
      })
    );
    const nCre = node(
      'orch-creative',
      720,
      140,
      role({
        name: 'Creative Writer',
        role: 'creative-writer',
        team: 'Creative Network',
        color: '#a855f7',
        network: 'creative',
        exposed: true,
        system:
          'You are the Creative Network. Turn research and numbers into clear prose. Match tone; keep inter-network briefs partner-safe.',
      })
    );
    return {
      nodes: [nSup, nRes, nComp, nCre],
      edges: [
        {
          id: 'e-intra-research',
          source: nRes.id,
          target: nSup.id,
          data: { crossCompany: false, interNetwork: false },
          ...edgeStyle(false),
        },
        {
          id: 'e-research-compute',
          source: nSup.id,
          target: nComp.id,
          data: { crossCompany: false, interNetwork: true },
          ...edgeStyle(true),
          label: 'inter-net',
        },
        {
          id: 'e-compute-creative',
          source: nComp.id,
          target: nCre.id,
          data: { crossCompany: false, interNetwork: true },
          ...edgeStyle(true),
          label: 'inter-net',
        },
        {
          id: 'e-research-creative',
          source: nSup.id,
          target: nCre.id,
          data: { crossCompany: false, interNetwork: true },
          ...edgeStyle(true),
          label: 'inter-net',
        },
      ],
      task:
        'Orchestrate a mesh run: research the topic, compute any estimates needed, and produce a short creative brief. Chief will route the primary network from your task wording.',
    };
  }

  // Cross-org demo: only these seed nodes carry company names (not a global default list)
  if (seed === 'partnership') {
    const n1 = node(
      'seed-r1',
      40,
      80,
      role({
        name: 'Researcher',
        role: 'research',
        team: 'Intel',
        company: 'Company A',
        color: '#3b82f6',
        exposed: false,
        system: 'You are a research agent for Company A. Gather internal insights.',
      })
    );
    const n2 = node(
      'seed-p1',
      40,
      240,
      role({
        name: 'Head of Product',
        role: 'product',
        team: 'Product',
        company: 'Company A',
        color: '#3b82f6',
        exposed: true,
        system:
          'You are Head of Product at Company A. Partner-facing. Share only what the other org needs.',
      })
    );
    const n3 = node(
      'seed-f1',
      420,
      240,
      role({
        name: 'Financial Operations',
        role: 'finance_ops',
        team: 'Finance',
        company: 'Company B',
        color: '#a855f7',
        exposed: true,
        system:
          'You are Financial Operations at Company B. Handle partner financial terms carefully.',
      })
    );
    const n4 = node(
      'seed-c1',
      420,
      80,
      role({
        name: 'Coder',
        role: 'coding',
        team: 'Engineering',
        company: 'Company B',
        color: '#a855f7',
        exposed: false,
        system: 'You are an engineer at Company B. Implement from partner-safe briefs only.',
      })
    );
    return {
      nodes: [n1, n2, n3, n4],
      edges: [
        {
          id: 'e1',
          source: n1.id,
          target: n2.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
        {
          id: 'e2',
          source: n2.id,
          target: n3.id,
          data: { crossCompany: true },
          ...edgeStyle(true),
        },
        {
          id: 'e3',
          source: n3.id,
          target: n4.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
      ],
      task:
        'Two organizations are exploring a partnership. Produce a partner-safe brief and next financial/ops steps.',
    };
  }

  if (seed === 'research') {
    const n1 = node(
      'seed-r',
      60,
      100,
      role({
        name: 'Researcher',
        role: 'research',
        team: 'Intel',
        color: '#60a5fa',
        exposed: false,
        system: 'You are a research agent. Gather facts and surface insights.',
      })
    );
    const n2 = node(
      'seed-a',
      320,
      100,
      role({
        name: 'Analyst',
        role: 'analyst',
        team: 'Intel',
        color: '#a855f7',
        exposed: false,
        system: 'You are an analyst. Extract patterns and next steps.',
      })
    );
    const n3 = node(
      'seed-w',
      580,
      100,
      role({
        name: 'Writer',
        role: 'writer',
        team: 'Content',
        color: '#ec4899',
        exposed: false,
        system: 'You are a writer. Turn analysis into a clear brief.',
      })
    );
    return {
      nodes: [n1, n2, n3],
      edges: [
        {
          id: 'e1',
          source: n1.id,
          target: n2.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
        {
          id: 'e2',
          source: n2.id,
          target: n3.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
      ],
      task: 'Research the topic and produce a structured brief.',
    };
  }

  if (seed === 'startup') {
    const n1 = node(
      'seed-p',
      40,
      80,
      role({
        name: 'Head of Product',
        role: 'product',
        team: 'Product',
        color: '#3b82f6',
        exposed: true,
        system: 'You are Head of Product. Define launch priorities.',
      })
    );
    const n2 = node(
      'seed-c',
      300,
      80,
      role({
        name: 'Coder',
        role: 'coding',
        team: 'Engineering',
        color: '#22c55e',
        exposed: false,
        system: 'You are an engineer. Outline implementation for launch.',
      })
    );
    const n3 = node(
      'seed-w',
      40,
      240,
      role({
        name: 'Writer',
        role: 'writer',
        team: 'Content',
        color: '#ec4899',
        exposed: false,
        system: 'You are a writer. Draft launch messaging.',
      })
    );
    const n4 = node(
      'seed-k',
      300,
      240,
      role({
        name: 'Critic',
        role: 'critic',
        team: 'QA',
        color: '#f97316',
        exposed: false,
        system: 'You are a critic. Stress-test the launch plan.',
      })
    );
    return {
      nodes: [n1, n2, n3, n4],
      edges: [
        {
          id: 'e1',
          source: n1.id,
          target: n2.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
        {
          id: 'e2',
          source: n1.id,
          target: n3.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
        {
          id: 'e3',
          source: n2.id,
          target: n4.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
        {
          id: 'e4',
          source: n3.id,
          target: n4.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
      ],
      task: 'Plan a product launch: priorities, build notes, messaging, and risks.',
    };
  }

  if (seed === 'finance') {
    const n1 = node(
      'seed-a',
      60,
      120,
      role({
        name: 'Analyst',
        role: 'analyst',
        team: 'Intel',
        color: '#a855f7',
        exposed: false,
        system: 'You are an analyst. Frame the financial question and assumptions.',
      })
    );
    const n2 = node(
      'seed-f',
      320,
      120,
      role({
        name: 'Financial Operations',
        role: 'finance_ops',
        team: 'Finance',
        color: '#eab308',
        exposed: true,
        system: 'You are Financial Operations. Numbers, risks, realistic projections.',
      })
    );
    const n3 = node(
      'seed-ceo',
      580,
      120,
      role({
        name: 'CEO',
        role: 'ceo',
        team: 'Executive',
        color: '#f59e0b',
        exposed: true,
        system: 'You are the CEO. Decide and summarize the call to action.',
      })
    );
    return {
      nodes: [n1, n2, n3],
      edges: [
        {
          id: 'e1',
          source: n1.id,
          target: n2.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
        {
          id: 'e2',
          source: n2.id,
          target: n3.id,
          data: { crossCompany: false },
          ...edgeStyle(false),
        },
      ],
      task: 'Run an internal financial review and produce an executive decision brief.',
    };
  }

  // blank — single agent, no company
  const n1 = node(
    'seed-blank',
    120,
    120,
    role({
      name: 'Researcher',
      role: 'research',
      team: 'Intel',
      color: '#60a5fa',
      exposed: false,
      system: 'You are a research agent. Gather facts and surface insights.',
    })
  );
  return { nodes: [n1], edges: [], task: '' };
}
