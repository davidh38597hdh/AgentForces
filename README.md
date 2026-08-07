# AgentForces

Multi-agent **mesh** orchestration — graph UX, per-agent models, BYOK, and Orchestrate + AMEP/1 concepts.

**Live:** [agentxforces.com](https://agentxforces.com)  
**Repo:** [davidh38597hdh/AgentForces](https://github.com/davidh38597hdh/AgentForces)

## Product merge

AgentForces unifies:

| Lineage | Contribution |
|---------|----------------|
| **AgentForces (this app)** | Next.js dashboard, portal, auth, token router, Vercel deploy |
| **Orchestrate / MAS** | Multi-network teams, chief routing, inter-network MessageBus |
| **AMEP/1 (amep-network)** | Protocol id, epoch sessions, envelope shape, SecureBus roadmap |

See [docs/MERGE.md](docs/MERGE.md) for architecture and status.

**Agent / contributor rules:** [AGENTS.md](AGENTS.md)

## Features

- **Mesh run** — chief routes primary network; agents execute on a graph with bus hop logs  
- **Networks** — research / computation / creative (Orchestrate catalog) + custom network ids  
- **Multi-provider agents** — xAI (Grok), OpenAI, Anthropic per node  
- **2D graph** — drag-and-drop, fan-in / fan-out, inter-network Ext edges  
- **Companies & teams** — multi-org graphs with controlled external interfaces  
- **BYOK** — API keys in the dashboard (browser storage)  
- **Token router** — control plane → user keys → server env  
- **Auth** — optional (Google OAuth not enabled yet; portal is open by default)  
- **Connectors** — URL fetch, Slack webhook, generic webhook  

## Setup

```bash
cd ~/code/AgentForces   # or clone path
npm install
npm run dev
# UI visualizer (no deploy): http://localhost:3000/ui
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|----------|
| `AUTH_REQUIRED` | No | Default false/open until Google is ready |
| `AUTH_SECRET` | Only if enforcing auth | NextAuth secret |
| `GOOGLE_CLIENT_ID` | Optional later | Google OAuth (not enabled yet) |
| `GOOGLE_CLIENT_SECRET` | Optional later | Google OAuth |
| `EMAIL_SERVER` | Email login | SMTP |
| `EMAIL_FROM` | Email login | From address |
| `XAI_API_KEY` | Optional | Server fallback for Grok |
| `OPENAI_API_KEY` | Optional | Server fallback |
| `ANTHROPIC_API_KEY` | Optional | Server fallback |
| `TOKEN_CONTROL_URL` | Optional | Future central key vault |
| `TOKEN_CONTROL_SECRET` | Optional | Auth for control plane |

## Try the Orchestrate mesh

1. Sign in → Portal → **Orchestrate mesh**  
2. Inspect research / computation / creative nodes and amber inter-network edges  
3. Run a task (e.g. “research X, estimate Y, write a short brief”)  
4. Sidebar shows AMEP/1 session meta + bus hops + agent log  

## Deploy

| Target | Role |
|--------|------|
| **Vercel** | Primary — connect GitHub, set env, deploy |
| **Fly.io / Docker / Render / Railway** | Secondary — same app via `Dockerfile` + standalone Next.js |

```bash
# Local secondary path
cp .env.example .env   # AUTH_SECRET, AUTH_URL, Google keys
docker compose up --build

# Fly.io
fly secrets set AUTH_SECRET=... AUTH_URL=https://YOURAPP.fly.dev AUTH_TRUST_HOST=true
fly deploy
```

Full guide: [docs/DEPLOY.md](docs/DEPLOY.md).

**Primary domain:** [agentxforces.com](https://agentxforces.com)

## Related (not product SOT)

- `reachdavidhuynh/agentforge` — earlier seed  
- `~/code/amep-network` — Python protocol + SecureBus + sandboxes  
- `~/Multi-Agent-System` — original Orchestrate Streamlit app  

## License

Private / all rights reserved unless stated otherwise.
