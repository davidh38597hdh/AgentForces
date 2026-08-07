import { tool } from 'ai';
import { z } from 'zod';
import { getAdapter, getConnectorById } from './registry';
import type { ConnectorActionResult, ConnectorConfig, ConnectorToolDef } from './types';
import { redactSecrets } from '@/lib/token-router';

const MAX_TOOL_CALLS_PER_AGENT = 5;

export function toolsForAgent(
  connectors: ConnectorConfig[],
  connectorIds: string[] | undefined
): ConnectorToolDef[] {
  if (!connectorIds?.length) return [];
  const tools: ConnectorToolDef[] = [];
  for (const id of connectorIds) {
    const c = getConnectorById(connectors, id);
    if (!c) continue;
    try {
      tools.push(...getAdapter(c.type).getTools(c));
    } catch {
      /* skip bad adapter */
    }
  }
  return tools;
}

export async function executeConnectorTool(
  connectors: ConnectorConfig[],
  toolName: string,
  args: Record<string, unknown>
): Promise<ConnectorActionResult | null> {
  for (const c of connectors) {
    const adapter = getAdapter(c.type);
    const defs = adapter.getTools(c);
    const def = defs.find((t) => t.toolName === toolName);
    if (!def) continue;
    const action = toolName.includes('send')
      ? 'send'
      : toolName.includes('post')
        ? 'post'
        : 'run';
    const result = await adapter.execute(c, action, args);
    return {
      connectorId: c.id,
      connectorName: c.name,
      type: c.type,
      action: toolName,
      ok: result.ok,
      detail: redactSecrets(result.detail),
    };
  }
  return null;
}

export async function runPostCompleteNotifiers(
  connectors: ConnectorConfig[],
  payload: { task: string; outcome: string; sessionId?: string }
): Promise<ConnectorActionResult[]> {
  const out: ConnectorActionResult[] = [];
  for (const c of connectors) {
    if (!c.notifyOnComplete) continue;
    try {
      const adapter = getAdapter(c.type);
      if (!adapter.notifyComplete) continue;
      const result = await adapter.notifyComplete(c, payload);
      out.push({
        connectorId: c.id,
        connectorName: c.name,
        type: c.type,
        action: 'notify_complete',
        ok: result.ok,
        detail: redactSecrets(result.detail),
      });
    } catch (e) {
      out.push({
        connectorId: c.id,
        connectorName: c.name,
        type: c.type,
        action: 'notify_complete',
        ok: false,
        detail: redactSecrets(e instanceof Error ? e.message : 'notify failed'),
      });
    }
  }
  return out;
}

function zodFromParameters(parameters: ConnectorToolDef['parameters']) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, prop] of Object.entries(parameters.properties)) {
    const desc = prop.description || key;
    const required = parameters.required?.includes(key);
    const base = z.string().describe(desc);
    shape[key] = required ? base : base.optional();
  }
  return z.object(shape);
}

/**
 * Build Vercel AI SDK tools for an agent’s allowlisted connectors.
 * Caps total tool executions per agent via MAX_TOOL_CALLS_PER_AGENT.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildAiToolsForAgent(
  connectors: ConnectorConfig[],
  connectorIds: string[] | undefined,
  onAction?: (r: ConnectorActionResult) => void
  // AI SDK tool generics vary by parameters; keep loose for dynamic schemas
): Record<string, any> {
  const defs = toolsForAgent(connectors, connectorIds);
  const tools: Record<string, any> = {};
  let callCount = 0;

  for (const def of defs) {
    const parameters = zodFromParameters(def.parameters);
    tools[def.toolName] = tool({
      description: def.description,
      parameters,
      execute: async (args) => {
        if (callCount >= MAX_TOOL_CALLS_PER_AGENT) {
          return {
            ok: false,
            detail: `Tool call limit (${MAX_TOOL_CALLS_PER_AGENT}) reached for this agent`,
          };
        }
        callCount += 1;
        const result = await executeConnectorTool(
          connectors,
          def.toolName,
          args as Record<string, unknown>
        );
        if (result && onAction) onAction(result);
        return (
          result || {
            ok: false,
            detail: 'Connector not found for tool',
          }
        );
      },
    });
  }

  return tools;
}

export { MAX_TOOL_CALLS_PER_AGENT };
