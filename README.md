# AgentForce

Multi-agent graph orchestration with per-agent model choice, BYOK API keys, and token routing.

**Live:** [agentxforce.com](https://agentxforce.com)

## Features

- **Multi-provider agents** — xAI (Grok), OpenAI, Anthropic per node
- **2D graph** — drag-and-drop nodes, fan-in / fan-out connections
- **Companies & teams** — multi-org graphs with controlled external interfaces
- **Roles** — Researcher, Coder, Financial Analyst, CEO, Head of Product, and more
- **BYOK** — paste your API keys in the dashboard (browser storage)
- **Token router** — control plane → user keys → server env
- **Auth** — Google + email magic link (NextAuth)
- **Connectors** — URL fetch, Slack webhook, generic webhook (Zapier)

## Setup

```bash
npm install
npm run dev
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|----------|
| `AUTH_SECRET` | For auth | NextAuth secret |
| `GOOGLE_CLIENT_ID` | Google login | OAuth |
| `GOOGLE_CLIENT_SECRET` | Google login | OAuth |
| `EMAIL_SERVER` | Email login | SMTP |
| `EMAIL_FROM` | Email login | From address |
| `XAI_API_KEY` | Optional | Server fallback for Grok |
| `OPENAI_API_KEY` | Optional | Server fallback |
| `ANTHROPIC_API_KEY` | Optional | Server fallback |
| `TOKEN_CONTROL_URL` | Optional | Future central key vault |
| `TOKEN_CONTROL_SECRET` | Optional | Auth for control plane |

## Deploy

Vercel: connect this repo, set env vars, deploy.

**Domain:** [agentxforce.com](https://agentxforce.com)

## License

Private / all rights reserved unless stated otherwise.
