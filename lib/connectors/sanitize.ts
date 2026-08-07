import { listConnectorTypes } from './registry';
import type { ConnectorConfig, ConnectorType } from './types';

const MAX_CONNECTORS = 20;
const MAX_CONFIG_VALUE_LEN = 4000;

const KNOWN = new Set<string>(listConnectorTypes());

/** Normalize client-sent connector configs before mesh run. */
export function sanitizeConnectors(raw: unknown): ConnectorConfig[] {
  if (!Array.isArray(raw)) return [];
  const out: ConnectorConfig[] = [];
  for (const item of raw.slice(0, MAX_CONNECTORS)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const type = String(o.type || '');
    if (!KNOWN.has(type)) continue;
    const id = String(o.id || '').trim().slice(0, 64);
    if (!id) continue;
    const name = String(o.name || type).trim().slice(0, 80) || type;
    const configIn =
      o.config && typeof o.config === 'object' && !Array.isArray(o.config)
        ? (o.config as Record<string, unknown>)
        : {};
    const config: Record<string, string> = {};
    for (const [k, v] of Object.entries(configIn)) {
      if (typeof v !== 'string') continue;
      const key = k.slice(0, 64);
      config[key] = v.slice(0, MAX_CONFIG_VALUE_LEN);
    }
    out.push({
      id,
      type: type as ConnectorType,
      name,
      config,
      notifyOnComplete: Boolean(o.notifyOnComplete),
    });
  }
  return out;
}

/**
 * Legacy body.connectors.slackWebhook / genericWebhook → synthetic configs
 * so older dashboard clients keep working.
 */
export function migrateLegacyConnectorFields(legacy: {
  slackWebhook?: string;
  genericWebhook?: string;
}): ConnectorConfig[] {
  const out: ConnectorConfig[] = [];
  const slack = (legacy.slackWebhook || '').trim();
  if (slack) {
    out.push({
      id: 'legacy-slack-webhook',
      type: 'slack_webhook',
      name: 'Legacy Slack webhook',
      config: { webhookUrl: slack },
      notifyOnComplete: true,
    });
  }
  const generic = (legacy.genericWebhook || '').trim();
  if (generic) {
    out.push({
      id: 'legacy-http-webhook',
      type: 'http_webhook',
      name: 'Legacy HTTP webhook',
      config: { url: generic },
      notifyOnComplete: true,
    });
  }
  return out;
}
