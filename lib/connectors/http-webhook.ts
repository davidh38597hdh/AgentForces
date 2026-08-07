import type { ConnectorAdapter } from './types';
import { assertSafeHttpsUrl } from './ssrf';

export const httpWebhookAdapter: ConnectorAdapter = {
  type: 'http_webhook',

  getTools(connector) {
    const suffix = connector.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    return [
      {
        toolName: `http_webhook_post_${suffix}`,
        connectorId: connector.id,
        description: `POST JSON to HTTP webhook "${connector.name}". Use for Zapier/Make/custom integrations.`,
        parameters: {
          type: 'object',
          properties: {
            payload: {
              type: 'string',
              description: 'JSON string body to POST',
            },
          },
          required: ['payload'],
        },
      },
    ];
  },

  async execute(connector, _action, args) {
    try {
      const url = assertSafeHttpsUrl(connector.config.url || '');
      let body: string;
      if (typeof args.payload === 'string') {
        body = args.payload;
        JSON.parse(body); // validate
      } else if (args.payload && typeof args.payload === 'object') {
        body = JSON.stringify(args.payload);
      } else {
        body = JSON.stringify(args);
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const bearer = (connector.config.bearerToken || '').trim();
      if (bearer) headers.Authorization = `Bearer ${bearer}`;

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: body.slice(0, 100_000),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { ok: false, detail: `Webhook HTTP ${res.status}` };
      return { ok: true, detail: `Webhook OK (${connector.name})` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : 'Webhook failed' };
    }
  },

  async notifyComplete(connector, payload) {
    return this.execute(connector, 'post', {
      payload: JSON.stringify({
        source: 'agentforces',
        event: 'mesh_complete',
        task: payload.task,
        outcome: payload.outcome.slice(0, 20000),
        sessionId: payload.sessionId,
        ts: new Date().toISOString(),
      }),
    });
  },
};
