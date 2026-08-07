/** Legacy lightweight agent (kept for compatibility). Prefer MeshAgent in lib/mesh. */
export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;
  network?: string;
}

export interface Workflow {
  id: string;
  name: string;
  agents: Agent[];
  // sequential for MVP
}

export interface RunLog {
  id: string;
  workflowId?: string;
  messages: { role: string; content: string; agentName?: string }[];
  createdAt: string;
}

/** Re-export mesh product types */
export type {
  MeshAgent,
  MeshEdge,
  MeshHopLog,
  MeshRunResult,
  MeshSessionMeta,
  MeshEnvelope,
  NetworkSpec,
} from './mesh';
