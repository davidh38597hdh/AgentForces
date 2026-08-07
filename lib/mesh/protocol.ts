/**
 * AMEP/1 protocol labels + mesh envelope types (concept merge from Orchestrate / amep-network).
 *
 * Full AEAD crypto lives in the Python runtime (`amep-network/runtime/agent_crypto`).
 * AgentForce ships the same *shape* on the Vercel product path: versioned protocol id,
 * epoch-bound sessions, inter-network envelopes, and a bus interface that can later
 * swap InMemory → SecureBus without changing the app surface.
 */

export const PROTOCOL_ID = 'AMEP/1' as const;
export const CRYPTO_SUITE_ID = 'davidh-agent-net-crypto-v1' as const;
/** Product surface: plaintext bus until SecureBus is wired server-side */
export const MESH_TRANSPORT: 'in_memory' | 'amep_aead' = 'in_memory';

export type MessageType = 'request' | 'response' | 'event' | 'handoff';

export type MeshEnvelope = {
  id: string;
  protocol: typeof PROTOCOL_ID;
  fromNetwork: string;
  toNetwork: string;
  msgType: MessageType;
  payload: Record<string, unknown>;
  correlationId?: string | null;
  timestamp: string;
  /** true when payload was AEAD-sealed (SecureBus); false for in-memory demo bus */
  sealed: boolean;
  metadata?: Record<string, unknown>;
};

export type MeshSessionMeta = {
  protocol: typeof PROTOCOL_ID;
  cryptoSuite: typeof CRYPTO_SUITE_ID;
  transport: typeof MESH_TRANSPORT;
  sessionId: string;
  networkId: string;
  epochId: string;
  chiefHandle: string;
  createdAt: string;
};

export function newId(prefix = 'msg'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function createSessionMeta(opts?: {
  tenantId?: string;
  chiefHandle?: string;
}): MeshSessionMeta {
  const tenant = opts?.tenantId || 'tenant-default';
  const sessionId = newId('orch');
  const epochId = newId('epoch');
  return {
    protocol: PROTOCOL_ID,
    cryptoSuite: CRYPTO_SUITE_ID,
    transport: MESH_TRANSPORT,
    sessionId,
    networkId: `${tenant}/${sessionId}`,
    epochId,
    chiefHandle: opts?.chiefHandle || '@chief-agentforce',
    createdAt: new Date().toISOString(),
  };
}
