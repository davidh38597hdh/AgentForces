/**
 * Chief routing — Orchestrate ChiefNode concept for AgentForce.
 * Keyword router (MAS-inspired) chooses primary network; graph edges still drive fan-out.
 */

import type { MeshSessionMeta } from './protocol';
import { createSessionMeta } from './protocol';
import { InMemoryMessageBus, makeEnvelope, type MessageBus } from './message-bus';

export type ChiefSession = {
  meta: MeshSessionMeta;
  bus: MessageBus;
};

export function openChiefSession(opts?: {
  tenantId?: string;
  chiefHandle?: string;
}): ChiefSession {
  return {
    meta: createSessionMeta(opts),
    bus: new InMemoryMessageBus(),
  };
}

/**
 * Route a user task to a primary network among known network ids.
 * Prefer first keyword match; default research if present else first.
 */
export function routeToNetwork(userMessage: string, networkIds: string[]): string {
  const msg = userMessage.toLowerCase();
  const known = new Set(networkIds);

  if (
    known.has('computation') &&
    ['calc', 'math', 'compute', 'number', 'estimate', '2**', '**', 'quant'].some((w) =>
      msg.includes(w)
    )
  ) {
    return 'computation';
  }
  if (
    known.has('creative') &&
    ['write', 'story', 'creative', 'brainstorm', 'poem', 'draft', 'copy'].some((w) =>
      msg.includes(w)
    )
  ) {
    return 'creative';
  }
  if (known.has('research')) return 'research';
  if (networkIds.length) return networkIds[0];
  throw new Error('No networks available to route to');
}

export function publishChiefTask(
  bus: MessageBus,
  opts: {
    chiefHandle: string;
    toNetwork: string;
    content: string;
    correlationId?: string;
  }
): string {
  const env = makeEnvelope({
    fromNetwork: opts.chiefHandle,
    toNetwork: opts.toNetwork,
    msgType: 'request',
    payload: { content: opts.content, role: 'chief_dispatch' },
    correlationId: opts.correlationId ?? null,
    metadata: { source: 'chief' },
  });
  bus.publish(env);
  return env.id;
}
