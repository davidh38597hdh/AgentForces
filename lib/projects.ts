/** Starter project templates shown on the portal before the mesh. */

export type ProjectTemplate = {
  id: string;
  title: string;
  description: string;
  tag: string;
  /** Seed query for dashboard */
  seed: string;
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'orchestrate',
    title: 'Multi-network force',
    description:
      'Research · Computation · Creative networks, chief routing, inter-network Ext hops — the AgentForces default.',
    tag: 'Core differentiator',
    seed: 'orchestrate',
  },
  {
    id: 'blank',
    title: 'Blank force',
    description: 'Empty canvas. Compose your own mesh of agents and companies.',
    tag: 'Start fresh',
    seed: 'blank',
  },
  {
    id: 'research',
    title: 'Research force',
    description: 'Researcher → Analyst → Writer. One company, sequential intel.',
    tag: 'Solo org',
    seed: 'research',
  },
  {
    id: 'startup',
    title: 'Launch force',
    description: 'Head of Product, Coder, Writer, Critic for a launch brief.',
    tag: 'Startup',
    seed: 'startup',
  },
  {
    id: 'partnership',
    title: 'Cross-org force',
    description:
      'Product (Ext) talks to Finance Ops (Ext) across two orgs you define. Boundaries by design — not a flat free-for-all.',
    tag: 'Cross-org',
    seed: 'partnership',
  },
  {
    id: 'finance',
    title: 'Executive review force',
    description: 'Analyst → Financial Operations → CEO for an internal decision chain.',
    tag: 'Finance',
    seed: 'finance',
  },
];
