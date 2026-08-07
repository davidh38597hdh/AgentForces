/** Connector config stored client-side (BYOK) and sent with each mesh run. */

export type ConnectorType =
  | 'slack_webhook'
  | 'slack_bot'
  | 'gmail_smtp'
  | 'http_webhook';

export type ConnectorConfig = {
  id: string;
  type: ConnectorType;
  name: string;
  /** Type-specific fields (webhookUrl, botToken, email, appPassword, …) */
  config: Record<string, string>;
  /** If true, fire with final mesh outcome after run */
  notifyOnComplete?: boolean;
};

export type ConnectorActionResult = {
  connectorId: string;
  connectorName: string;
  type: ConnectorType;
  action: string;
  ok: boolean;
  detail: string;
};

export type ConnectorToolDef = {
  /** Unique tool name exposed to the model, e.g. slack_post_abc123 */
  toolName: string;
  connectorId: string;
  description: string;
  /** JSON-schema-like parameters for AI SDK */
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

export type ConnectorAdapter = {
  type: ConnectorType;
  /** Build model-callable tools for this connector instance */
  getTools: (connector: ConnectorConfig) => ConnectorToolDef[];
  execute: (
    connector: ConnectorConfig,
    action: string,
    args: Record<string, unknown>
  ) => Promise<{ ok: boolean; detail: string }>;
  /** Optional: post-run notify with plain text */
  notifyComplete?: (
    connector: ConnectorConfig,
    payload: { task: string; outcome: string; sessionId?: string }
  ) => Promise<{ ok: boolean; detail: string }>;
};

export const CONNECTOR_TYPE_META: Record<
  ConnectorType,
  { label: string; fields: { key: string; label: string; secret?: boolean; placeholder?: string }[] }
> = {
  slack_webhook: {
    label: 'Slack Incoming Webhook',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        secret: true,
        placeholder: 'https://hooks.slack.com/services/…',
      },
    ],
  },
  slack_bot: {
    label: 'Slack Bot Token',
    fields: [
      { key: 'botToken', label: 'Bot token', secret: true, placeholder: 'xoxb-…' },
      { key: 'defaultChannel', label: 'Default channel', placeholder: '#general' },
    ],
  },
  gmail_smtp: {
    label: 'Gmail (SMTP app password)',
    fields: [
      { key: 'email', label: 'Gmail address', placeholder: 'you@gmail.com' },
      { key: 'appPassword', label: 'App password', secret: true, placeholder: '16-char app password' },
      { key: 'from', label: 'From (optional)', placeholder: 'AgentForces <you@gmail.com>' },
      {
        key: 'notifyTo',
        label: 'Notify-to on complete (optional)',
        placeholder: 'you@gmail.com',
      },
    ],
  },
  http_webhook: {
    label: 'HTTP Webhook',
    fields: [
      { key: 'url', label: 'URL', placeholder: 'https://…' },
      { key: 'bearerToken', label: 'Bearer token (optional)', secret: true },
    ],
  },
};
