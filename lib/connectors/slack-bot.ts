import type { ConnectorAdapter } from './types';

export const slackBotAdapter: ConnectorAdapter = {
  type: 'slack_bot',

  getTools(connector) {
    const suffix = connector.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const ch = connector.config.defaultChannel || '#general';
    return [
      {
        toolName: `slack_bot_post_${suffix}`,
        connectorId: connector.id,
        description: `Post a message to Slack using bot connector "${connector.name}". Default channel ${ch}. Use for notifications or sharing results.`,
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Message text' },
            channel: {
              type: 'string',
              description: `Channel name or ID (optional, default ${ch})`,
            },
          },
          required: ['text'],
        },
      },
    ];
  },

  async execute(connector, _action, args) {
    const token = (connector.config.botToken || '').trim();
    if (!token.startsWith('xoxb-')) {
      return { ok: false, detail: 'Invalid Slack bot token (expected xoxb-…)' };
    }
    const text = String(args.text || '').trim();
    if (!text) return { ok: false, detail: 'text is required' };
    const channel = String(args.channel || connector.config.defaultChannel || '#general').trim();

    try {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel,
          text: text.slice(0, 3500),
        }),
        signal: AbortSignal.timeout(12000),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        return { ok: false, detail: data.error || `Slack API HTTP ${res.status}` };
      }
      return { ok: true, detail: `Posted to Slack ${channel}` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : 'Slack bot failed' };
    }
  },

  async notifyComplete(connector, payload) {
    return this.execute(connector, 'post', {
      text: `*AgentForces* — mesh complete\n*Task:* ${payload.task.slice(0, 400)}\n\n${payload.outcome.slice(0, 3000)}`,
      channel: connector.config.defaultChannel,
    });
  },
};
