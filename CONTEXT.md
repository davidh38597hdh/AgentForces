# AgentForces — project handoff

**Updated:** 2026-08-07  
**Status:** **active**  
**Product name:** AgentForces  
**Repo (GitHub SOT):** [davidh38597hdh/AgentForces](https://github.com/davidh38597hdh/AgentForces)  
**Remote:** `davidh` → `git@github.com:davidh38597hdh/AgentForces.git` (tracks `main`)  
**Upstream copy:** [reachdavidhuynh/AgentForces](https://github.com/reachdavidhuynh/AgentForces) (`origin`, not primary)  
**Local path:** `~/code/AgentForces`  
**Live:** [agentforces.com](https://agentforces.com)  
**Related (earlier cut):** [reachdavidhuynh/agentforge](https://github.com/reachdavidhuynh/agentforge) — not source of truth  

Global queue + handles: `~/.grok/memory/MEMORY.md`  
Paradigm: `~/.grok/memory/AGENT_NETWORK_PARADIGM.md`

---

## Queue

| Priority | Project | Path | Status | Chief |
|---|---|---|---|---|
| **Active product** | AgentForces | `~/code/AgentForces` | **active** | `@chief-agentforces` |

---

## Team (agent network)

| Handle(s) | Role | Status |
|---|---|---|
| `@chief-agentforces` · `agentforces:` · `af:` · `chief-agentforces:` | Chief / coordinator | active |
| `@af-product` · `af-product:` | Product / positioning | unassigned (chief covers; **user input required** for major product calls) |
| `@af-eng` · `af-eng:` | Engineering (Next.js, graph, orchestrate API) | unassigned (chief covers) |
| `@af-auth` · `af-auth:` | Auth / NextAuth / identity | unassigned |
| `@af-deploy` · `af-deploy:` | Vercel / domain / env | unassigned |

---

## What this is

Multi-agent **mesh** product (Orchestrate + AMEP/1 concepts merged 2026-08-07):

- Per-agent model choice (xAI Grok, OpenAI, Anthropic)
- BYOK API keys (browser storage) + token router (control plane → user keys → server env)
- 2D graph UI (`@xyflow/react`) — nodes, fan-in / fan-out
- **Networks** (research / computation / creative) + chief routing + MessageBus hop log
- **AMEP/1** session metadata (epoch, protocol id); SecureBus crypto still in amep-network Python
- Companies & teams, roles (Researcher, Coder, etc.)
- Auth: Google + email magic link (NextAuth v5)
- Connectors: URL fetch, Slack webhook, generic webhook
- Deploy targets: **Vercel (primary)** · **Fly.io / Docker / Render / Railway (secondary)** via standalone + Dockerfile

**Stack:** Next.js 15, React 19, Vercel AI SDK, NextAuth 5, Tailwind, TypeScript.

**Merge doc:** `docs/MERGE.md`

---

## Tree (high level)

```
app/
  page.tsx              # landing
  login/                # auth UI
  dashboard/            # mesh graph + hop UI
  portal/               # project templates (incl. Orchestrate mesh)
  api/chat/             # chat route
  api/orchestrate/      # mesh runner (chief + bus + LLM)
  api/auth/             # NextAuth
lib/
  mesh/                 # protocol, bus, chief, networks, run-mesh
  types.ts
  projects.ts
  seed-graph.ts
  token-router.ts
docs/
  MERGE.md              # Orchestrate + AMEP → AgentForces map
  DEPLOY.md             # Vercel + Docker/Fly/Render/Railway
Dockerfile / fly.toml / render.yaml / docker-compose.yml
auth.ts
middleware.ts
```

---

## Autonomy rules (session standing)

- **Autonomous:** local impl, refactors, tests, docs polish, routine git, bugfixes, small UX.
- **Require user input:** product direction, naming/positioning, pricing/GTM, major architecture or protocol, scope changes, destructive/shared ops (force-push, public posts, production env secrets).

---

## Resume

```bash
cd ~/code/AgentForces
npm install
npm run dev
```

Env vars: see `README.md` (`AUTH_SECRET`, Google OAuth, email SMTP, optional provider keys).

**Product SOT:** this repo.  
**Concept sources (merged):** Orchestrate / MAS UX + amep-network AMEP/1 shape.  
**Still in Python amep-network:** full AEAD SecureBus, Daytona/Modal sandboxes — future adapters.
