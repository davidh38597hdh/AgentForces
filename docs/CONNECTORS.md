# AgentForces connectors

Agents can call **outbound tools** during a mesh run (Slack, Gmail, HTTP webhooks) and optionally **notify** when a run completes. Secrets stay **BYOK in the browser** (`localStorage`); they are sent only with each `/api/orchestrate` request.

---

## Built-in types

| Type | What it does | Config |
|------|----------------|--------|
| `slack_webhook` | Incoming Webhook post | `webhookUrl` |
| `slack_bot` | `chat.postMessage` | `botToken` (`xoxb-…`), `defaultChannel` |
| `gmail_smtp` | **Send-only** email via Gmail SMTP | `email`, `appPassword`, optional `from`, `notifyTo` |
| `http_webhook` | POST JSON to a URL | `url`, optional `bearerToken` |

Gmail is **send only** (no inbox read). Create an [App Password](https://myaccount.google.com/apppasswords) with 2FA enabled.

---

## Product flow

1. Dashboard header → **Connectors** → add Slack / Gmail / webhook (stored as `agentforces_connectors_v1`).
2. Select an agent → **Configure** → check which connectors that agent may use as tools.
3. Optional: enable **Auto-notify** on a connector so it fires with the final outcome after the run (no tool call required).
4. **Run mesh** — allowlisted agents get AI SDK tools (`maxSteps` + per-agent call cap).

---

## Runtime

| Piece | Path |
|-------|------|
| Types / field meta | `lib/connectors/types.ts` |
| Adapters | `lib/connectors/slack-*.ts`, `gmail-smtp.ts`, `http-webhook.ts` |
| Registry | `lib/connectors/registry.ts` (`registerConnectorAdapter`) |
| Tools + post-complete | `lib/connectors/execute.ts` |
| SSRF (https only, no private hosts) | `lib/connectors/ssrf.ts` |
| Sanitize client payload | `lib/connectors/sanitize.ts` |
| Mesh wiring | `lib/mesh/run-mesh.ts` (`connectorIds`, `connectors`) |
| API | `app/api/orchestrate/route.ts` |

- Per agent: max **5** connector tool calls (`MAX_TOOL_CALLS_PER_AGENT`).
- Webhook URLs must be **https** and not private/metadata hosts.
- Legacy body fields `connectors.slackWebhook` / `connectors.genericWebhook` still map to synthetic notify connectors.

---

## Adding a new connector type

1. Extend `ConnectorType` and `CONNECTOR_TYPE_META` in `types.ts`.
2. Implement a `ConnectorAdapter` (`getTools`, `execute`, optional `notifyComplete`).
3. Register in `registry.ts`.
4. Dashboard form fields come from `CONNECTOR_TYPE_META` automatically.

Server-side extensibility without a UI field: `registerConnectorAdapter(type, adapter)` (type still needs to be on the union for TypeScript).

---

## Security notes

- Connector secrets are **not** stored on the server; treat them like BYOK API keys (XSS can steal localStorage).
- Production mesh still requires Google session (see `docs/SECURITY.md`).
- Never log webhook URLs, bot tokens, or app passwords; orchestrate errors are redacted.
- Prefer least privilege: only assign connectors to agents that need them.

---

## Request shape (orchestrate)

```json
{
  "agents": [{ "id": "…", "name": "…", "system": "…", "connectorIds": ["conn_…"] }],
  "edges": [],
  "task": "…",
  "connectors": [
    {
      "id": "conn_…",
      "type": "slack_webhook",
      "name": "Ops Slack",
      "config": { "webhookUrl": "https://hooks.slack.com/…" },
      "notifyOnComplete": true
    }
  ],
  "userKeys": {}
}
```

Response includes `connectorActions[]` (`ok`, `detail`, `action`, connector meta) for the run log.
