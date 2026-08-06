export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;
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