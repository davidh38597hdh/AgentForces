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
  company: string;
  exposed: boolean;
};

const COMPANIES = [
  { id: 'acme', name: 'Acme Corp', color: '#3b82f6' },
  { id: 'nova', name: 'Nova Labs', color: '#a855f7' },
];

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

function node(
  id: string,
  x: number,
  y: number,
  data: SeedAgentData
): Node {
  return { id, type: 'agent', position: { x, y }, data };
}

function role(
  partial: Omit<SeedAgentData, 'provider' | 'model' | 'color'> & { color?: string }
): SeedAgentData {
  return {
    provider: 'xai',
    model: 'grok-3',
    color: partial.color || '#3b82f6',
    ...partial,
  };
}

export function buildProjectSeed(seed: string): {
  nodes: Node[];
  edges: Edge[];
  task: string;
} {
  const acme = COMPANIES[0];
  const nova = COMPANIES[1];

  if (seed === 'partnership') {
    const n1 = node(
      'seed-r1',
      40,
      80,
      role({
        name: 'Researcher',
        role: 'research',
        team: 'Intel',
        company: acme.name,
        color: acme.color,
        exposed: false,
        system: 'You are a research agent for Acme. Gather internal insights.',
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
        company: acme.name,
        color: acme.color,
        exposed: true,
        system:
          'You are Head of Product at Acme. Partner-facing. Share only what Nova needs.',
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
        company: nova.name,
        color: nova.color,
        exposed: true,
        system:
          'You are Financial Operations at Nova. Handle partner financial terms carefully.',
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
        company: nova.name,
        color: nova.color,
        exposed: false,
        system: 'You are an engineer at Nova. Implement from partner-safe briefs only.',
      })
    );
    return {
      nodes: [n1, n2, n3, n4],
      edges: [
        { id: 'e1', source: n1.id, target: n2.id, data: { crossCompany: false }, ...edgeStyle(false) },
        { id: 'e2', source: n2.id, target: n3.id, data: { crossCompany: true }, ...edgeStyle(true) },
        { id: 'e3', source: n3.id, target: n4.id, data: { crossCompany: false }, ...edgeStyle(false) },
      ],
      task: 'Acme and Nova are exploring a partnership. Produce a partner-safe brief and next financial/ops steps.',
    };
  }

  if (seed === 'research') {
    const a = acme;
    const n1 = node('seed-r', 60, 100, role({
      name: 'Researcher', role: 'research', team: 'Intel', company: a.name, color: a.color, exposed: false,
      system: 'You are a research agent. Gather facts and surface insights.',
    }));
    const n2 = node('seed-a', 320, 100, role({
      name: 'Analyst', role: 'analyst', team: 'Intel', company: a.name, color: a.color, exposed: false,
      system: 'You are an analyst. Extract patterns and next steps.',
    }));
    const n3 = node('seed-w', 580, 100, role({
      name: 'Writer', role: 'writer', team: 'Content', company: a.name, color: a.color, exposed: false,
      system: 'You are a writer. Turn analysis into a clear brief.',
    }));
    return {
      nodes: [n1, n2, n3],
      edges: [
        { id: 'e1', source: n1.id, target: n2.id, data: { crossCompany: false }, ...edgeStyle(false) },
        { id: 'e2', source: n2.id, target: n3.id, data: { crossCompany: false }, ...edgeStyle(false) },
      ],
      task: 'Research the topic and produce a structured brief.',
    };
  }

  if (seed === 'startup') {
    const a = acme;
    const n1 = node('seed-p', 40, 80, role({
      name: 'Head of Product', role: 'product', team: 'Product', company: a.name, color: a.color, exposed: true,
      system: 'You are Head of Product. Define launch priorities.',
    }));
    const n2 = node('seed-c', 300, 80, role({
      name: 'Coder', role: 'coding', team: 'Engineering', company: a.name, color: a.color, exposed: false,
      system: 'You are an engineer. Outline implementation for launch.',
    }));
    const n3 = node('seed-w', 40, 240, role({
      name: 'Writer', role: 'writer', team: 'Content', company: a.name, color: a.color, exposed: false,
      system: 'You are a writer. Draft launch messaging.',
    }));
    const n4 = node('seed-k', 300, 240, role({
      name: 'Critic', role: 'critic', team: 'QA', company: a.name, color: a.color, exposed: false,
      system: 'You are a critic. Stress-test the launch plan.',
    }));
    return {
      nodes: [n1, n2, n3, n4],
      edges: [
        { id: 'e1', source: n1.id, target: n2.id, data: { crossCompany: false }, ...edgeStyle(false) },
        { id: 'e2', source: n1.id, target: n3.id, data: { crossCompany: false }, ...edgeStyle(false) },
        { id: 'e3', source: n2.id, target: n4.id, data: { crossCompany: false }, ...edgeStyle(false) },
        { id: 'e4', source: n3.id, target: n4.id, data: { crossCompany: false }, ...edgeStyle(false) },
      ],
      task: 'Plan a product launch: priorities, build notes, messaging, and risks.',
    };
  }

  if (seed === 'finance') {
    const a = acme;
    const n1 = node('seed-a', 60, 120, role({
      name: 'Analyst', role: 'analyst', team: 'Intel', company: a.name, color: a.color, exposed: false,
      system: 'You are an analyst. Frame the financial question and assumptions.',
    }));
    const n2 = node('seed-f', 320, 120, role({
      name: 'Financial Operations', role: 'finance_ops', team: 'Finance', company: a.name, color: a.color, exposed: true,
      system: 'You are Financial Operations. Numbers, risks, realistic projections.',
    }));
    const n3 = node('seed-ceo', 580, 120, role({
      name: 'CEO', role: 'ceo', team: 'Executive', company: a.name, color: a.color, exposed: true,
      system: 'You are the CEO. Decide and summarize the call to action.',
    }));
    return {
      nodes: [n1, n2, n3],
      edges: [
        { id: 'e1', source: n1.id, target: n2.id, data: { crossCompany: false }, ...edgeStyle(false) },
        { id: 'e2', source: n2.id, target: n3.id, data: { crossCompany: false }, ...edgeStyle(false) },
      ],
      task: 'Run an internal financial review and produce an executive decision brief.',
    };
  }

  // blank
  const n1 = node('seed-blank', 120, 120, role({
    name: 'Researcher',
    role: 'research',
    team: 'Intel',
    company: acme.name,
    color: acme.color,
    exposed: false,
    system: 'You are a research agent. Gather facts and surface insights.',
  }));
  return { nodes: [n1], edges: [], task: '' };
}
