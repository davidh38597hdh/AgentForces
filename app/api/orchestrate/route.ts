import { runMesh, type MeshAgent, type MeshEdge } from '@/lib/mesh';
import type { UserKeyBag } from '@/lib/token-router';
import { requireSession } from '@/lib/require-session';

export const maxDuration = 120;

function sanitizeError(message: string): string {
  // Never echo secrets in API errors
  return message
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]')
    .replace(/xai-[a-zA-Z0-9_-]+/gi, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}

export async function POST(req: Request) {
  try {
    const gate = await requireSession();
    if (!gate.ok) return gate.response;
    const session = gate.session;

    const body = await req.json();
    const agents: MeshAgent[] = (body.agents || []).slice(0, 12);
    const edges: MeshEdge[] = body.edges || [];
    const task: string = body.task || '';
    const contextText: string = body.contextText || '';
    const urls: string[] = body.urls || [];
    const connectors = body.connectors || {};
    const userKeys: UserKeyBag = body.userKeys || {};
    const chiefRoute = body.chiefRoute !== false;

    if (!agents.length || !task.trim()) {
      return Response.json({ error: 'Agents and task are required' }, { status: 400 });
    }

    const result = await runMesh({
      agents,
      edges,
      task,
      contextText,
      urls,
      userKeys,
      userEmail: session?.user?.email || null,
      chiefRoute,
      tenantId: session?.user?.email || 'tenant-default',
    });

    // Drop any chance of keys lingering on the body reference
    void userKeys;

    const outcome = result.outcome;

    if (connectors.slackWebhook) {
      try {
        await fetch(connectors.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `*AgentForces mesh outcome* (${result.session.protocol})\n\n${outcome.slice(0, 3500)}`,
          }),
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
          body: JSON.stringify({
            task,
            outcome,
            log: result.log,
            hops: result.hops,
            session: result.session,
            primaryNetwork: result.primaryNetwork,
            userEmail: session?.user?.email || null,
            ts: new Date().toISOString(),
          }),
        });
      } catch {
        /* ignore */
      }
    }

    return Response.json({
      log: result.log,
      hops: result.hops,
      session: result.session,
      primaryNetwork: result.primaryNetwork,
      outcome,
      final: result.final,
      busMessageCount: result.busHistory.length,
      security: {
        meshTransport: result.session.transport,
        sealedHops: false,
        note:
          result.session.transport === 'in_memory'
            ? 'Mesh hops are not AEAD-sealed yet (AMEP metadata only).'
            : 'Mesh hops use AEAD transport.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Orchestration failed';
    console.error('Orchestrate error:', sanitizeError(message));
    return Response.json({ error: sanitizeError(message) }, { status: 500 });
  }
}
