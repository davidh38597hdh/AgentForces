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
    title: 'Orchestrate mesh',
    description:
      'Research · Computation · Creative networks with chief routing and inter-network bus hops (AMEP/1 concept).',
    tag: 'Orchestrate + AMEP',
    seed: 'orchestrate',
  },
  {
    id: 'blank',
    title: 'Blank mesh',
    description: 'Empty canvas. Add agents and companies yourself.',
    tag: 'Start fresh',
    seed: 'blank',
  },
  {
    id: 'research',
    title: 'Research team',
    description: 'Researcher → Analyst → Writer. One company, sequential intel.',
    tag: 'Solo org',
    seed: 'research',
  },
  {
    id: 'startup',
    title: 'Product launch',
    description: 'Head of Product, Coder, Writer, Critic for a launch brief.',
    tag: 'Startup',
    seed: 'startup',
  },
  {
    id: 'partnership',
    title: 'Two-company partnership',
    description:
      'Acme Product (external) talks to Nova Finance Ops (external). Controlled interface.',
    tag: 'Cross-org',
    seed: 'partnership',
  },
  {
    id: 'finance',
    title: 'Financial review',
    description: 'Analyst → Financial Operations → CEO for an internal review chain.',
    tag: 'Finance',
    seed: 'finance',
  },
];
