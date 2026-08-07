import { runMesh, type MeshAgent, type MeshEdge } from '@/lib/mesh';
import type { UserKeyBag } from '@/lib/token-router';
import { requireSession } from '@/lib/require-session';
import {
  migrateLegacyConnectorFields,
  sanitizeConnectors,
} from '@/lib/connectors';

export const maxDuration = 120;

function sanitizeError(message: string): string {
  // Never echo secrets in API errors
  return message
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]')
    .replace(/xai-[a-zA-Z0-9_-]+/gi, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/xoxb-[a-zA-Z0-9-]+/g, 'xoxb-[redacted]')
    .replace(/hooks\.slack\.com\/services\/\S+/gi, 'hooks.slack.com/services/[redacted]');
}

export async function POST(req: Request) {
  try {
    const gate = await requireSession();
    if (!gate.ok) return gate.response;
    const session = gate.session;

    const body = await req.json();
    const agentsRaw = (body.agents || []).slice(0, 12);
    const agents: MeshAgent[] = agentsRaw.map(
      (a: MeshAgent & { connectorIds?: unknown }) => ({
        id: String(a.id || ''),
        name: String(a.name || 'Agent'),
        system: String(a.system || ''),
        provider: a.provider,
        model: a.model,
        company: a.company,
        team: a.team,
        network: a.network,
        exposed: Boolean(a.exposed),
        connectorIds: Array.isArray(a.connectorIds)
          ? a.connectorIds.map(String).slice(0, 20)
          : undefined,
      })
    );
    const edges: MeshEdge[] = body.edges || [];
    const task: string = body.task || '';
    const contextText: string = body.contextText || '';
    const urls: string[] = body.urls || [];
    const attachmentsRaw = Array.isArray(body.attachments) ? body.attachments : [];
    const attachments = attachmentsRaw
      .slice(0, 12)
      .map((a: { name?: string; mime?: string; text?: string }) => ({
        name: String(a?.name || 'attachment').slice(0, 200),
        mime: a?.mime ? String(a.mime).slice(0, 120) : undefined,
        text: String(a?.text || '').slice(0, 20_000),
      }))
      .filter((a: { text: string }) => a.text.trim().length > 0);
    const userKeys: UserKeyBag = body.userKeys || {};
    const chiefRoute = body.chiefRoute !== false;

    // New: connectors[] array; legacy: connectors.slackWebhook / genericWebhook object
    let connectors = sanitizeConnectors(body.connectors);
    if (!connectors.length && body.connectors && !Array.isArray(body.connectors)) {
      connectors = migrateLegacyConnectorFields({
        slackWebhook: body.connectors.slackWebhook,
        genericWebhook: body.connectors.genericWebhook,
      });
    }
    // Also accept top-level legacy fields if still sent alone
    if (!connectors.length && (body.slackWebhook || body.genericWebhook)) {
      connectors = migrateLegacyConnectorFields({
        slackWebhook: body.slackWebhook,
        genericWebhook: body.genericWebhook,
      });
    }

    if (!agents.length || !task.trim()) {
      return Response.json({ error: 'Agents and task are required' }, { status: 400 });
    }

    const result = await runMesh({
      agents,
      edges,
      task,
      contextText,
      urls,
      attachments,
      userKeys,
      userEmail: session?.user?.email || null,
      chiefRoute,
      tenantId: session?.user?.email || 'tenant-default',
      connectors,
    });

    // Drop any chance of keys lingering on the body reference
    void userKeys;
    void connectors;

    return Response.json({
      log: result.log,
      hops: result.hops,
      session: result.session,
      primaryNetwork: result.primaryNetwork,
      outcome: result.outcome,
      final: result.final,
      busMessageCount: result.busHistory.length,
      connectorActions: result.connectorActions,
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
