/**
 * Inter-network MessageBus — Orchestrate/MAS interface, AgentForce TypeScript port.
 * SecureBus (AMEP AEAD) can wrap the same interface later.
 */

import {
  type MeshEnvelope,
  type MessageType,
  MESH_TRANSPORT,
  PROTOCOL_ID,
  newId,
} from './protocol';

export type BusHandler = (message: MeshEnvelope) => void;

export interface MessageBus {
  publish(message: MeshEnvelope): void;
  subscribe(networkId: string, handler: BusHandler): void;
  getPending(networkId: string): MeshEnvelope[];
  clear(networkId?: string): void;
  readonly history: MeshEnvelope[];
}

export function makeEnvelope(input: {
  fromNetwork: string;
  toNetwork: string;
  msgType?: MessageType;
  payload: Record<string, unknown>;
  correlationId?: string | null;
  sealed?: boolean;
  metadata?: Record<string, unknown>;
}): MeshEnvelope {
  return {
    id: newId('msg'),
    protocol: PROTOCOL_ID,
    fromNetwork: input.fromNetwork,
    toNetwork: input.toNetwork,
    msgType: input.msgType || 'request',
    payload: input.payload,
    correlationId: input.correlationId ?? null,
    timestamp: new Date().toISOString(),
    sealed: input.sealed ?? MESH_TRANSPORT === 'amep_aead',
    metadata: input.metadata,
  };
}

/** Process-local plain bus (development / Vercel edge-friendly). Not AMEP-secure. */
export class InMemoryMessageBus implements MessageBus {
  private queues = new Map<string, MeshEnvelope[]>();
  private handlers = new Map<string, BusHandler[]>();
  private _history: MeshEnvelope[] = [];

  publish(message: MeshEnvelope): void {
    this._history.push(message);
    const targets =
      message.toNetwork && message.toNetwork !== '*'
        ? [message.toNetwork]
        : [...this.queues.keys()].filter((id) => id !== message.fromNetwork);

    for (const target of targets) {
      const q = this.queues.get(target) || [];
      q.push(message);
      this.queues.set(target, q);
      for (const h of this.handlers.get(target) || []) {
        try {
          h(message);
        } catch {
          /* ignore handler errors */
        }
      }
    }
  }

  subscribe(networkId: string, handler: BusHandler): void {
    const list = this.handlers.get(networkId) || [];
    list.push(handler);
    this.handlers.set(networkId, list);
    if (!this.queues.has(networkId)) this.queues.set(networkId, []);
  }

  getPending(networkId: string): MeshEnvelope[] {
    const msgs = this.queues.get(networkId) || [];
    this.queues.set(networkId, []);
    return msgs;
  }

  clear(networkId?: string): void {
    if (networkId) {
      this.queues.set(networkId, []);
    } else {
      this.queues.clear();
      this._history = [];
    }
  }

  get history(): MeshEnvelope[] {
    return [...this._history];
  }
}
