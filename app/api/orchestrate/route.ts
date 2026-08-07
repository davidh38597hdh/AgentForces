import { auth } from '@/auth';
import { runMesh, type MeshAgent, type MeshEdge } from '@/lib/mesh';
import type { UserKeyBag } from '@/lib/token-router';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const session = await auth().catch(() => null);
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
      // bus history ids only (avoid large payloads)
      busMessageCount: result.busHistory.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Orchestration failed';
    console.error('Orchestrate error:', error);
    return Response.json({ error: message }, { status: 500 });
  }
}
