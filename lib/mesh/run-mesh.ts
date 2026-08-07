/**
 * Mesh runner: graph topo execution + Orchestrate-style bus hops + chief route.
 */

import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  resolveProviderKey,
  type ProviderId,
  type UserKeyBag,
} from '@/lib/token-router';
import { openChiefSession, publishChiefTask, routeToNetwork } from './chief';
import { makeEnvelope } from './message-bus';
import type { MeshEnvelope, MeshSessionMeta } from './protocol';

export type MeshAgent = {
  id: string;
  name: string;
  system: string;
  provider?: ProviderId;
  model?: string;
  company?: string;
  team?: string;
  /** Logical Orchestrate network id (research | computation | creative | custom) */
  network?: string;
  exposed?: boolean;
};

export type MeshEdge = {
  from: string;
  to: string;
  crossCompany?: boolean;
  /** Inter-network bus hop when true or when network ids differ */
  interNetwork?: boolean;
};

export type MeshHopLog = {
  messageId: string;
  from: string;
  to: string;
  msgType: string;
  boundary: 'intra' | 'inter' | 'chief';
  sealed: boolean;
  note: string;
};

export type AgentRunLog = {
  id: string;
  agent: string;
  provider: string;
  model: string;
  network: string;
  output: string;
};

export type MeshRunResult = {
  session: MeshSessionMeta;
  primaryNetwork: string | null;
  log: AgentRunLog[];
  hops: MeshHopLog[];
  busHistory: MeshEnvelope[];
  outcome: string;
  final: string;
};

function networkOf(agent: MeshAgent): string {
  if (agent.network?.trim()) return agent.network.trim().toLowerCase();
  if (agent.team?.trim()) {
    const t = agent.team.trim().toLowerCase();
    if (t.includes('research') || t.includes('intel')) return 'research';
    if (t.includes('comput') || t.includes('engineer') || t.includes('quant'))
      return 'computation';
    if (t.includes('creative') || t.includes('content') || t.includes('writ'))
      return 'creative';
    return t.replace(/\s+/g, '-');
  }
  if (agent.company?.trim()) return agent.company.trim().toLowerCase().replace(/\s+/g, '-');
  return 'default';
}

function topoSort(agents: MeshAgent[], edges: MeshEdge[]): MeshAgent[] {
  const ids = new Set(agents.map((a) => a.id));
  const byId = new Map(agents.map((a) => [a.id, a]));
  const valid = edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
  if (!valid.length) return agents;

  const indeg = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const id of Array.from(ids)) {
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

function externalBrief(text: string, fromName: string, fromLabel: string): string {
  const trimmed = text.trim();
  const short = trimmed.length > 1200 ? `${trimmed.slice(0, 1200)}…` : trimmed;
  return (
    `### External / inter-network brief from ${fromName} (${fromLabel})\n` +
    `Shared across mesh boundaries. Treat as partner- or network-facing only.\n\n${short}`
  );
}

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

export async function fetchUrlContent(url: string): Promise<string> {
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

export type MeshRunInput = {
  agents: MeshAgent[];
  edges: MeshEdge[];
  task: string;
  contextText?: string;
  urls?: string[];
  userKeys?: UserKeyBag;
  userEmail?: string | null;
  /** When true (default), chief keyword-routes primary network first */
  chiefRoute?: boolean;
  tenantId?: string;
};

export async function runMesh(input: MeshRunInput): Promise<MeshRunResult> {
  const agents = input.agents.slice(0, 12);
  const byId = new Map(agents.map((a) => [a.id, a]));

  const safeEdges = input.edges.filter((e) => {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) return false;
    const fromNet = networkOf(from);
    const toNet = networkOf(to);
    const crossCompany =
      e.crossCompany ||
      (!!from.company && !!to.company && from.company !== to.company);
    const interNetwork = e.interNetwork || fromNet !== toNet || crossCompany;
    if (interNetwork && !(from.exposed && to.exposed)) return false;
    return true;
  });

  const chief = openChiefSession({
    tenantId: input.tenantId,
    chiefHandle: '@chief-agentforce',
  });
  const hops: MeshHopLog[] = [];

  const networkIds = Array.from(new Set(agents.map(networkOf)));
  let primaryNetwork: string | null = null;

  if (input.chiefRoute !== false && networkIds.length > 0) {
    try {
      primaryNetwork = routeToNetwork(input.task, networkIds);
      const mid = publishChiefTask(chief.bus, {
        chiefHandle: chief.meta.chiefHandle,
        toNetwork: primaryNetwork,
        content: input.task,
      });
      hops.push({
        messageId: mid,
        from: chief.meta.chiefHandle,
        to: primaryNetwork,
        msgType: 'request',
        boundary: 'chief',
        sealed: false,
        note: `Chief routed task → ${primaryNetwork}`,
      });
    } catch {
      primaryNetwork = networkIds[0] || null;
    }
  }

  let urlBlock = '';
  if (input.urls?.length) {
    const fetched = await Promise.all(
      input.urls.slice(0, 2).map(async (u) => `### Source: ${u}\n${await fetchUrlContent(u)}`)
    );
    urlBlock = fetched.join('\n\n');
  }

  // Prefer agents in primary network first when chief routed, then remaining topo
  let ordered = topoSort(agents, safeEdges);
  if (primaryNetwork) {
    const primary = ordered.filter((a) => networkOf(a) === primaryNetwork);
    const rest = ordered.filter((a) => networkOf(a) !== primaryNetwork);
    ordered = [...primary, ...rest];
  }

  const outputs = new Map<string, string>();
  const log: AgentRunLog[] = [];

  for (const agent of ordered) {
    const provider = (agent.provider || 'xai') as ProviderId;
    const modelId =
      agent.model ||
      (provider === 'openai'
        ? 'gpt-4o-mini'
        : provider === 'anthropic'
          ? 'claude-3-5-haiku-latest'
          : 'grok-3');

    const agentNet = networkOf(agent);
    const inbound = safeEdges.filter((e) => e.to === agent.id);
    let upstream = '';

    if (inbound.length) {
      upstream = inbound
        .map((e) => {
          const parent = byId.get(e.from);
          const text = outputs.get(e.from);
          if (!parent || !text) return '';
          const parentNet = networkOf(parent);
          const crossCompany =
            e.crossCompany ||
            (!!parent.company && !!agent.company && parent.company !== agent.company);
          const inter = e.interNetwork || parentNet !== agentNet || crossCompany;

          const env = makeEnvelope({
            fromNetwork: parentNet,
            toNetwork: agentNet,
            msgType: inter ? 'handoff' : 'request',
            payload: {
              content: text,
              fromAgent: parent.name,
              toAgent: agent.name,
            },
            metadata: { edgeFrom: e.from, edgeTo: e.to },
          });
          chief.bus.publish(env);
          hops.push({
            messageId: env.id,
            from: `${parent.name}@${parentNet}`,
            to: `${agent.name}@${agentNet}`,
            msgType: env.msgType,
            boundary: inter ? 'inter' : 'intra',
            sealed: env.sealed,
            note: inter ? 'Inter-network handoff' : 'Intra-network message',
          });

          if (inter) {
            return externalBrief(
              text,
              parent.name,
              `${parent.company || parentNet} / ${parent.team || parentNet}`
            );
          }
          return `### From ${parent.name} (${parent.company || parentNet} / ${parent.team || 'Team'})\n${text}`;
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

    // Pending bus messages addressed to this network (e.g. chief dispatch)
    const pending = chief.bus.getPending(agentNet);
    if (pending.length) {
      const busBlock = pending
        .map(
          (m) =>
            `### Mesh bus (${m.msgType}) ${m.fromNetwork} → ${m.toNetwork}\n${String(
              (m.payload as { content?: string }).content || JSON.stringify(m.payload)
            )}`
        )
        .join('\n\n');
      upstream = [upstream, busBlock].filter(Boolean).join('\n\n');
    }

    const orgLine = [
      agent.company && `Company: ${agent.company}`,
      agent.team && `Team: ${agent.team}`,
      `Network: ${agentNet}`,
      agent.exposed && 'Role type: external / inter-network interface',
      `Protocol: ${chief.meta.protocol} · epoch ${chief.meta.epochId}`,
    ]
      .filter(Boolean)
      .join(' · ');

    let system = agent.system;
    if (agent.exposed) {
      system +=
        '\n\nWhen your output may be shared with another network or company, include a short "External brief" section with only information safe for partners. Keep internal strategy and sensitive numbers out of that brief.';
    }
    system +=
      '\n\nYou are part of an AgentForce mesh (Orchestrate + AMEP/1 concepts). Prefer structured handoffs when work should move to another network.';

    let prompt = `Original task:\n${input.task}\n\n`;
    if (primaryNetwork) {
      prompt += `Chief primary route: ${primaryNetwork} (you are on ${agentNet})\n\n`;
    }
    if (orgLine) prompt += `Your mesh context: ${orgLine}\n\n`;
    if (input.contextText?.trim()) prompt += `Shared context:\n${input.contextText.trim()}\n\n`;
    if (urlBlock) prompt += `Fetched web content:\n${urlBlock}\n\n`;
    if (upstream) prompt += `Upstream / bus inputs:\n${upstream}\n\n`;
    prompt += `Your role: ${agent.name}.\nProvide your contribution. Be concise and useful.`;

    const model = await getModel(provider, modelId, input.userKeys, input.userEmail);
    const result = await generateText({ model, system, prompt });

    outputs.set(agent.id, result.text);

    // Publish response on bus for observability
    const resp = makeEnvelope({
      fromNetwork: agentNet,
      toNetwork: chief.meta.chiefHandle,
      msgType: 'response',
      payload: { content: result.text, agentId: agent.id, agentName: agent.name },
    });
    chief.bus.publish(resp);
    hops.push({
      messageId: resp.id,
      from: `${agent.name}@${agentNet}`,
      to: chief.meta.chiefHandle,
      msgType: 'response',
      boundary: 'intra',
      sealed: resp.sealed,
      note: 'Agent response to chief',
    });

    log.push({
      id: agent.id,
      agent: `${agent.name}${agent.company ? ` · ${agent.company}` : ''}`,
      provider,
      model: modelId,
      network: agentNet,
      output: result.text,
    });
  }

  const sinkNodes =
    safeEdges.length > 0
      ? ordered.filter((a) => !safeEdges.some((e) => e.from === a.id))
      : ordered.slice(-1);
  const outcome =
    sinkNodes
      .map(
        (a) =>
          `## ${a.name}${a.company ? ` (${a.company})` : ''} · ${networkOf(a)}\n${outputs.get(a.id) || ''}`
      )
      .join('\n\n') ||
    log[log.length - 1]?.output ||
    '';

  return {
    session: chief.meta,
    primaryNetwork,
    log,
    hops,
    busHistory: chief.bus.history,
    outcome,
    final: log[log.length - 1]?.output || '',
  };
}
