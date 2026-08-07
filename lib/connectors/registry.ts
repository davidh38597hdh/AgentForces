import type { ConnectorAdapter, ConnectorConfig, ConnectorType } from './types';
import { slackWebhookAdapter } from './slack-webhook';
import { slackBotAdapter } from './slack-bot';
import { gmailSmtpAdapter } from './gmail-smtp';
import { httpWebhookAdapter } from './http-webhook';

const adapters: Record<ConnectorType, ConnectorAdapter> = {
  slack_webhook: slackWebhookAdapter,
  slack_bot: slackBotAdapter,
  gmail_smtp: gmailSmtpAdapter,
  http_webhook: httpWebhookAdapter,
};

export function getAdapter(type: ConnectorType): ConnectorAdapter {
  const a = adapters[type];
  if (!a) throw new Error(`Unknown connector type: ${type}`);
  return a;
}

export function listConnectorTypes(): ConnectorType[] {
  return Object.keys(adapters) as ConnectorType[];
}

/** Register or replace an adapter (extensibility). */
export function registerConnectorAdapter(type: ConnectorType, adapter: ConnectorAdapter): void {
  adapters[type] = adapter;
}

export function getConnectorById(
  list: ConnectorConfig[],
  id: string
): ConnectorConfig | undefined {
  return list.find((c) => c.id === id);
}
