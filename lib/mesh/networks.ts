/**
 * Default Orchestrate team catalog (research / computation / creative)
 * mapped into AgentForce network specs.
 */

export type RoleSpec = {
  name: string;
  instructions: string;
  tools: string[];
  description: string;
};

export type NetworkSpec = {
  networkId: string;
  displayName: string;
  description: string;
  /** Color for graph nodes */
  color: string;
  /** Allowed inter-network edge targets */
  edges: string[];
  roles: RoleSpec[];
  resources: 'small' | 'medium' | 'large';
};

/** Mesh edges for the classic three-network Orchestrate layout */
export const DEFAULT_NETWORK_EDGES: Record<string, string[]> = {
  research: ['computation', 'creative'],
  computation: ['research'],
  creative: ['research'],
};

export function defaultNetworkCatalog(): NetworkSpec[] {
  return [
    {
      networkId: 'research',
      displayName: 'Research Network',
      description: 'Information gathering, analysis, summarization',
      color: '#3b82f6',
      resources: 'small',
      edges: [...DEFAULT_NETWORK_EDGES.research],
      roles: [
        {
          name: 'research-supervisor',
          instructions:
            'You supervise research specialists. Break down questions, delegate gathering and synthesis, return clear summaries. You may hand off quantitative work to computation or writing to creative via the mesh bus.',
          tools: ['send_to_network', 'check_inbox'],
          description: 'Research supervisor',
        },
        {
          name: 'researcher',
          instructions:
            'You gather information and extract key facts. Prefer concise bullet findings.',
          tools: ['web_search', 'send_to_network', 'check_inbox'],
          description: 'Research specialist',
        },
      ],
    },
    {
      networkId: 'computation',
      displayName: 'Computation Network',
      description: 'Math and quantitative reasoning (sandbox-ready)',
      color: '#22c55e',
      resources: 'medium',
      edges: [...DEFAULT_NETWORK_EDGES.computation],
      roles: [
        {
          name: 'compute-lead',
          instructions:
            'You solve quantitative problems. Show assumptions and final numeric answers clearly. Prefer step-by-step math.',
          tools: ['calculator', 'code_exec', 'send_to_network', 'check_inbox'],
          description: 'Computation lead',
        },
      ],
    },
    {
      networkId: 'creative',
      displayName: 'Creative Network',
      description: 'Writing, brainstorming, storytelling',
      color: '#a855f7',
      resources: 'small',
      edges: [...DEFAULT_NETWORK_EDGES.creative],
      roles: [
        {
          name: 'creative-writer',
          instructions:
            'You write clear, engaging prose and brainstorm ideas. Match the user tone and length preferences.',
          tools: ['send_to_network', 'check_inbox'],
          description: 'Creative writer',
        },
      ],
    },
  ];
}

export function networkById(id: string): NetworkSpec | undefined {
  return defaultNetworkCatalog().find((n) => n.networkId === id);
}
