import type { ConnectorAdapter, ConnectorConfig } from './types';
import { assertSafeHttpsUrl } from './ssrf';

export const slackWebhookAdapter: ConnectorAdapter = {
  type: 'slack_webhook',

  getTools(connector) {
    const suffix = connector.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    return [
      {
        toolName: `slack_webhook_post_${suffix}`,
        connectorId: connector.id,
        description: `Post a message to Slack via connector "${connector.name}" (incoming webhook). Use when the user or task needs a Slack notification.`,
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Message text to post to Slack' },
          },
          required: ['text'],
        },
      },
    ];
  },

  async execute(connector, action, args) {
    if (action !== 'post' && !action.includes('post')) {
      return { ok: false, detail: `Unknown action ${action}` };
    }
    const text = String(args.text || '').trim();
    if (!text) return { ok: false, detail: 'text is required' };
    try {
      const url = assertSafeHttpsUrl(connector.config.webhookUrl || '');
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 3500) }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        return { ok: false, detail: `Slack webhook HTTP ${res.status}` };
      }
      return { ok: true, detail: `Posted to Slack webhook (${connector.name})` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : 'Slack webhook failed' };
    }
  },

  async notifyComplete(connector, payload) {
    return this.execute(connector, 'post', {
      text: `*AgentForces* — mesh complete\n*Task:* ${payload.task.slice(0, 400)}\n\n${payload.outcome.slice(0, 3000)}`,
    });
  },
};

export function isSlackWebhook(c: ConnectorConfig): boolean {
  return c.type === 'slack_webhook';
}
