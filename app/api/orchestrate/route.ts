import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

export const maxDuration = 120;

type Provider = 'xai' | 'openai' | 'anthropic';

type AgentNode = {
  id: string;
  name: string;
  system: string;
  provider?: Provider;
  model?: string;
};

type Edge = { from: string; to: string };

function getModel(provider: Provider, modelId?: string) {
  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(modelId || 'gpt-4o-mini');
  }
  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic(modelId || 'claude-3-5-haiku-latest');
  }
  // default xai / grok
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY is not set');
  }
  return xai(modelId || 'grok-3');
}

/** Topological order. If no edges, keep input order. */
function topoSort(agents: AgentNode[], edges: Edge[]): AgentNode[] {
  const ids = new Set(agents.map((a) => a.id));
  const byId = new Map(agents.map((a) => [a.id, a]));
  const validEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);

  if (validEdges.length === 0) return agents;

  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    outs.set(id, []);
  }
  for (const e of validEdges) {
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    outs.get(e.from)!.push(e.to);
  }

  const queue = agents.map((a) => a.id).filter((id) => (indeg.get(id) || 0) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const t of outs.get(id) || []) {
      indeg.set(t, (indeg.get(t) || 0) - 1);
      if (indeg.get(t) === 0) queue.push(t);
    }
  }

  // cycle fallback: append remaining in original order
  if (order.length < agents.length) {
    for (const a of agents) {
      if (!order.includes(a.id)) order.push(a.id);
    }
  }

  return order.map((id) => byId.get(id)!).filter(Boolean);
}

function parentsOf(id: string, edges: Edge[]): string[] {
  return edges.filter((e) => e.to === id).map((e) => e.from);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const agents: AgentNode[] = (body.agents || []).slice(0, 6);
    const edges: Edge[] = body.edges || [];
    const task: string = body.task || '';
    const contextText: string = body.contextText || '';

    if (!agents.length || !task.trim()) {
      return Response.json({ error: 'Agents and task are required' }, { status: 400 });
    }

    const ordered = topoSort(agents, edges);
    const outputs = new Map<string, string>();
    const log: {
      id: string;
      agent: string;
      provider: string;
      model: string;
      output: string;
    }[] = [];

    for (const agent of ordered) {
      const provider = (agent.provider || 'xai') as Provider;
      const modelId =
        agent.model ||
        (provider === 'openai'
          ? 'gpt-4o-mini'
          : provider === 'anthropic'
          ? 'claude-3-5-haiku-latest'
          : 'grok-3');

      const parentIds = parentsOf(agent.id, edges);
      let upstream = '';
      if (parentIds.length) {
        upstream = parentIds
          .map((pid) => {
            const parent = agents.find((a) => a.id === pid);
            const text = outputs.get(pid);
            if (!text) return '';
            return `### From ${parent?.name || pid}\n${text}`;
          })
          .filter(Boolean)
          .join('\n\n');
      } else if (outputs.size > 0 && edges.length === 0) {
        // linear fallback: previous in order
        const idx = ordered.findIndex((a) => a.id === agent.id);
        if (idx > 0) {
          const prev = ordered[idx - 1];
          upstream = `### From ${prev.name}\n${outputs.get(prev.id) || ''}`;
        }
      }

      let prompt = `Original task:\n${task}\n\n`;
      if (contextText.trim()) prompt += `Shared context:\n${contextText.trim()}\n\n`;
      if (upstream) prompt += `Upstream agent outputs:\n${upstream}\n\n`;
      prompt += `Your role: ${agent.name}.\nProvide your contribution based on the task and any upstream outputs. Be concise and useful.`;

      const model = getModel(provider, modelId);
      const result = await generateText({
        model,
        system: agent.system,
        prompt,
      });

      outputs.set(agent.id, result.text);
      log.push({
        id: agent.id,
        agent: agent.name,
        provider,
        model: modelId,
        output: result.text,
      });
    }

    // outcome = outputs of sink nodes (no outgoing edges), or last log entry
    const sources = new Set(edges.map((e) => e.from));
    const targets = new Set(edges.map((e) => e.to));
    const sinks = ordered.filter((a) => !sources.has(a.id) || (targets.has(a.id) && !sources.has(a.id)));
    const sinkNodes =
      edges.length > 0
        ? ordered.filter((a) => !edges.some((e) => e.from === a.id))
        : ordered.slice(-1);

    const outcome = sinkNodes
      .map((a) => `## ${a.name}\n${outputs.get(a.id) || ''}`)
      .join('\n\n');

    return Response.json({
      log,
      outcome: outcome || log[log.length - 1]?.output || '',
      final: log[log.length - 1]?.output || '',
    });
  } catch (error: any) {
    console.error('Orchestrate error:', error);
    return Response.json(
      { error: error?.message || 'Orchestration failed' },
      { status: 500 }
    );
  }
}
