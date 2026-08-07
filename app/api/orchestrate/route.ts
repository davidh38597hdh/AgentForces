import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { resolveProviderKey, type ProviderId, type UserKeyBag } from '@/lib/token-router';
import { auth } from '@/auth';

export const maxDuration = 120;

type AgentNode = {
  id: string;
  name: string;
  system: string;
  provider?: ProviderId;
  model?: string;
  company?: string;
  team?: string;
  exposed?: boolean;
};

type Edge = {
  from: string;
  to: string;
  crossCompany?: boolean;
};

async function getModel(
  provider: ProviderId,
  modelId: string | undefined,
  userKeys?: UserKeyBag,
  userEmail?: string | null
) {
  const { key } = await resolveProviderKey(provider, { userKeys, userEmail });

  if (provider === 'openai') {
    return createOpenAI({ apiKey: key })(modelId || 'gpt-4o-mini');
  }
  if (provider === 'anthropic') {
    return createAnthropic({ apiKey: key })(modelId || 'claude-3-5-haiku-latest');
  }
  return createXai({ apiKey: key })(modelId || 'grok-3');
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentForce/1.0)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return `[Failed ${url}: ${res.status}]`;
    const text = await res.text();
    return (
      text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000) || `[No content from ${url}]`
    );
  } catch {
    return `[Could not fetch ${url}]`;
  }
}

function topoSort(agents: AgentNode[], edges: Edge[]): AgentNode[] {
  const ids = new Set(agents.map((a) => a.id));
  const byId = new Map(agents.map((a) => [a.id, a]));
  const valid = edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
  if (!valid.length) return agents;

  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    outs.set(id, []);
  }
  for (const e of valid) {
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    outs.get(e.from)!.push(e.to);
  }

  const q = agents.map((a) => a.id).filter((id) => (indeg.get(id) || 0) === 0);
  const order: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    for (const t of outs.get(id) || []) {
      indeg.set(t, (indeg.get(t) || 0) - 1);
      if (indeg.get(t) === 0) q.push(t);
    }
  }
  if (order.length < agents.length) {
    for (const a of agents) if (!order.includes(a.id)) order.push(a.id);
  }
  return order.map((id) => byId.get(id)!).filter(Boolean);
}

/** For cross-company edges, only pass a partner-safe brief, not full internal text */
function externalBrief(text: string, fromName: string, fromCompany: string): string {
  const trimmed = text.trim();
  const short = trimmed.length > 1200 ? `${trimmed.slice(0, 1200)}…` : trimmed;
  return (
    `### External interface brief from ${fromName} (${fromCompany})\n` +
    `This content is shared across company boundaries. Treat as partner-facing only.\n\n${short}`
  );
}

export async function POST(req: Request) {
  try {
    const session = await auth().catch(() => null);
    const body = await req.json();
    const agents: AgentNode[] = (body.agents || []).slice(0, 12);
    const edges: Edge[] = body.edges || [];
    const task: string = body.task || '';
    const contextText: string = body.contextText || '';
    const urls: string[] = body.urls || [];
    const connectors = body.connectors || {};
    const userKeys: UserKeyBag = body.userKeys || {};

    if (!agents.length || !task.trim()) {
      return Response.json({ error: 'Agents and task are required' }, { status: 400 });
    }

    // Enforce exposure on cross-company edges server-side
    const byId = new Map(agents.map((a) => [a.id, a]));
    const safeEdges = edges.filter((e) => {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      if (!from || !to) return false;
      const cross =
        e.crossCompany ||
        (!!from.company && !!to.company && from.company !== to.company);
      if (cross && !(from.exposed && to.exposed)) return false;
      return true;
    });

    let urlBlock = '';
    if (urls.length) {
      const fetched = await Promise.all(
        urls.slice(0, 2).map(async (u) => `### Source: ${u}\n${await fetchUrlContent(u)}`)
      );
      urlBlock = fetched.join('\n\n');
    }

    const ordered = topoSort(agents, safeEdges);
    const outputs = new Map<string, string>();
    const log: { id: string; agent: string; provider: string; model: string; output: string }[] = [];
    const userEmail = session?.user?.email || null;

    for (const agent of ordered) {
      const provider = (agent.provider || 'xai') as ProviderId;
      const modelId =
        agent.model ||
        (provider === 'openai'
          ? 'gpt-4o-mini'
          : provider === 'anthropic'
            ? 'claude-3-5-haiku-latest'
            : 'grok-3');

      const inbound = safeEdges.filter((e) => e.to === agent.id);
      let upstream = '';

      if (inbound.length) {
        upstream = inbound
          .map((e) => {
            const parent = byId.get(e.from);
            const text = outputs.get(e.from);
            if (!parent || !text) return '';
            const cross =
              e.crossCompany ||
              (!!parent.company &&
                !!agent.company &&
                parent.company !== agent.company);
            if (cross) {
              return externalBrief(text, parent.name, parent.company || 'Partner');
            }
            return `### From ${parent.name} (${parent.company || 'Internal'} / ${parent.team || 'Team'})\n${text}`;
          })
          .filter(Boolean)
          .join('\n\n');
      } else if (outputs.size > 0 && safeEdges.length === 0) {
        const idx = ordered.findIndex((a) => a.id === agent.id);
        if (idx > 0) {
          const prev = ordered[idx - 1];
          upstream = `### From ${prev.name}\n${outputs.get(prev.id) || ''}`;
        }
      }

      const orgLine = [
        agent.company && `Company: ${agent.company}`,
        agent.team && `Team: ${agent.team}`,
        agent.exposed && 'Role type: external interface (partner-facing)',
      ]
        .filter(Boolean)
        .join(' · ');

      let system = agent.system;
      if (agent.exposed) {
        system +=
          '\n\nWhen your output may be shared with another company, include a short "External brief" section with only information safe for partners. Keep internal strategy and sensitive numbers out of that brief.';
      }

      let prompt = `Original task:\n${task}\n\n`;
      if (orgLine) prompt += `Your org context: ${orgLine}\n\n`;
      if (contextText.trim()) prompt += `Shared context:\n${contextText.trim()}\n\n`;
      if (urlBlock) prompt += `Fetched web content:\n${urlBlock}\n\n`;
      if (upstream) prompt += `Upstream inputs:\n${upstream}\n\n`;
      prompt += `Your role: ${agent.name}.\nProvide your contribution. Be concise and useful.`;

      const model = await getModel(provider, modelId, userKeys, userEmail);
      const result = await generateText({ model, system, prompt });

      outputs.set(agent.id, result.text);
      log.push({
        id: agent.id,
        agent: `${agent.name}${agent.company ? ` · ${agent.company}` : ''}`,
        provider,
        model: modelId,
        output: result.text,
      });
    }

    const sinkNodes =
      safeEdges.length > 0
        ? ordered.filter((a) => !safeEdges.some((e) => e.from === a.id))
        : ordered.slice(-1);
    const outcome =
      sinkNodes.map((a) => `## ${a.name}${a.company ? ` (${a.company})` : ''}\n${outputs.get(a.id) || ''}`).join('\n\n') ||
      log[log.length - 1]?.output ||
      '';

    if (connectors.slackWebhook) {
      try {
        await fetch(connectors.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `*AgentForce outcome*\n\n${outcome.slice(0, 3500)}` }),
        });
      } catch {
        /* ignore */
      }
    }
    if (connectors.genericWebhook) {
      try {
        await fetch(connectors.genericWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, outcome, log, userEmail, ts: new Date().toISOString() }),
        });
      } catch {
        /* ignore */
      }
    }

    return Response.json({ log, outcome, final: log[log.length - 1]?.output || '' });
  } catch (error: any) {
    console.error('Orchestrate error:', error);
    return Response.json({ error: error?.message || 'Orchestration failed' }, { status: 500 });
  }
}
