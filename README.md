# AgentForces

**Force, not framework.**  
Private multi-agent **mesh** for business outcomes — visual canvas, company/network boundaries, chief routing, BYOK, production Google auth, AMEP/1 path.

**Live:** [agentxforces.com](https://www.agentxforces.com)  
**Repo:** [davidh38597hdh/AgentForces](https://github.com/davidh38597hdh/AgentForces)

> Create your own force with a mesh of agents who work together to get common outcomes.

## Differentiation

| | LangGraph | CrewAI | **AgentForces** |
|--|-----------|--------|-----------------|
| Layer | Graph **runtime** in your code | **Crews** in your code | **Mesh product** + canvas |
| Buyer | Engineers embedding agents | Builders scripting teams | Teams **fielding a force** |
| Boundaries | Your app | Your app | Companies · networks · **Ext** |
| Security story | App-level | App-level | **AMEP/1** path · auth · BYOK |

Full positioning: [docs/POSITIONING.md](docs/POSITIONING.md) · Security: [docs/SECURITY.md](docs/SECURITY.md)

## Product pillars

1. **Force, not framework** — run meshes in product, don’t reimplement orchestration  
2. **Boundaries by design** — Ext-only cross-company / inter-network edges  
3. **Chief + networks** — research · computation · creative + hop-visible runs  
4. **Your keys** — per-agent xAI / OpenAI / Anthropic (BYOK + token router)  
5. **Mesh protocol path** — AMEP/1 session identity; AEAD sealed hops as roadmap  
6. **Operator UX** — agent library, inspector, canvas (not a notebook)

## Features

- Mesh run with chief routing and bus hop logs  
- Multi-org graphs + Ext interfaces  
- Collapsible **Agent library** (left) and **Inspector** (right)  
- Google OAuth — **required in production** (no guest mesh)  
- Secondary deploy: Docker / Fly / Render (`docs/DEPLOY.md`)

## Setup

```bash
cd ~/code/AgentForces
npm install
npm run dev
# UI kit: http://localhost:3000/ui
```

### Environment (production)

| Variable | Required | Purpose |
|----------|----------|----------|
| `AUTH_URL` | Yes | **`https://www.agentxforces.com`** (match www) |
| `NEXT_PUBLIC_APP_URL` | Yes | Same host as AUTH_URL |
| `AUTH_TRUST_HOST` | Yes | `true` |
| `AUTH_SECRET` | Yes | Session signing |
| `GOOGLE_CLIENT_ID` | Yes | Not `GOOGLE_CLIENT` |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth |
| Provider keys | Optional | Server fallback; BYOK preferred |

Google redirect: `https://www.agentxforces.com/api/auth/callback/google`

## Agent rules

[AGENTS.md](AGENTS.md) · Mesh merge history: [docs/MERGE.md](docs/MERGE.md)

## License

Private / all rights reserved unless stated otherwise.
