# AgentForces — Grok Build rules

**Force, not framework.** Private multi-agent **mesh product** for business outcomes.  
**Live:** https://www.agentxforces.com · **Repo:** https://github.com/davidh38597hdh/AgentForces  
**Positioning:** [docs/POSITIONING.md](docs/POSITIONING.md) (vs LangGraph / CrewAI)  
**Security:** [docs/SECURITY.md](docs/SECURITY.md)  
**Connectors:** [docs/CONNECTORS.md](docs/CONNECTORS.md) (Gmail, Slack, webhooks)

Standing playbook for agents in this tree. Prefer it over ad-hoc assumptions.

### Product thesis (do not dilute)

- We are a **mesh product** (UI + identity + boundaries + run), not an embeddable agent library.
- Differentiation: **companies/networks/Ext**, chief routing, BYOK, AMEP path — not “another multi-agent framework.”
- Copy and features should reinforce **fielding a force**, not competing as LangGraph-in-a-browser.

---

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind
- `@xyflow/react` for the 2D canvas
- Vercel AI SDK (`ai`, `@ai-sdk/xai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`)
- NextAuth v5 present — **Google OAuth not product-ready** (optional; default open guest access)
- Deploy primary: **Vercel** → agentxforces.com  
- Deploy secondary: Docker / Fly / Render / Railway (`docs/DEPLOY.md`)

## Commands

```bash
cd ~/code/AgentForces   # or clone path
npm install
npm run dev      # local
npm run build    # must pass before claiming a change done
```

---

## Architecture (keep intact unless product asks otherwise)

| Area | Location | Notes |
|------|----------|--------|
| Auth mode | `lib/auth-mode.ts` | Open by default; gate only when Google env + `AUTH_REQUIRED` |
| Auth | `auth.ts`, `app/api/auth/[...nextauth]` | Google provider **only when configured**; no email/magic-link |
| Middleware | `middleware.ts` | Protects `/portal` + `/dashboard` **only if** `isAuthRequired()` |
| Portal | `app/portal/page.tsx` | Templates → `/dashboard?project=<seed>` |
| Templates | `lib/projects.ts` | blank, research, startup, partnership, finance, **orchestrate** |
| Seeds | `lib/seed-graph.ts` | `buildProjectSeed(seed)` → `{ nodes, edges, task }` |
| Dashboard | `app/dashboard/page.tsx`, `AgentNode.tsx` | React Flow; reads `?project=` via `useSearchParams` + Suspense |
| Mesh core | `lib/mesh/*` | AMEP/1 labels, MessageBus, chief route, networks, `runMesh` |
| Connectors | `lib/connectors/*` | Gmail SMTP, Slack webhook/bot, HTTP webhook; per-agent tools + post-run notify |
| Orchestrate API | `app/api/orchestrate/route.ts` | Calls `runMesh` (topo + bus hops + connector tools + notifiers) |
| Token router | `lib/token-router.ts` | control plane → user BYOK → env |
| Deploy helpers | `lib/deploy.ts` | Vercel vs Docker/Fly detection; production URL default agentxforces.com |
| Health | `app/api/health/route.ts` | Liveness for secondary hosts |

### Mesh / Orchestrate + AMEP (merged concepts)

- **Networks:** research · computation · creative (see `lib/mesh/networks.ts`)
- **Chief:** keyword-routes primary network (`@chief-agentforces` / product handles in `CONTEXT.md`)
- **Bus:** inter-network envelopes (`lib/mesh/message-bus.ts`); transport `in_memory` today, `amep_aead` later
- **UI:** hop log + session meta after **Run mesh**

Do not treat Streamlit Orchestrate / Python `amep-network` as this repo’s deploy SOT; port concepts, don’t drag the monorepo in by default.

---

## Graph rules

- One node may fan-out to many targets (multiple edges allowed).
- Cross-company **or inter-network** links only when **both** nodes have `exposed: true` (External interface).
- Cross / inter-network edges: dashed amber; orchestrate sanitizes as external / inter-network brief.
- Companies: **none by default** — user creates them in Library → Companies (`agentforces_companies_v1`). Seeds may leave `company` empty.
- Optional `network` field on nodes (research | computation | creative | custom).

---

## UI conventions

- Dark zinc palette (`#0a0a0a` background). Title **AgentForces** prominent but understated.
- Client components start with `'use client'`.
- BYOK keys in `localStorage` key `agentforces_user_keys_v1` only — never log or commit them.
- Connector secrets in `localStorage` key `agentforces_connectors_v1` (BYOK) — never log or commit them.
- No loud marketing on the landing page.
- Default CTAs: **Open portal** / **Mesh canvas** (not Google) until auth ships.

---

## Auth stance (current product)

| Mode | When | Behavior |
|------|------|----------|
| **Production** | `VERCEL_ENV=production` (or Docker prod) | **Always** require Google session — no guest mesh |
| **Local/dev** | Google unset or `AUTH_REQUIRED=false` | Guest allowed for velocity |
| **Gated local** | Google credentials present | Middleware enforces session |

- **Do not** re-add email / magic-link unless explicitly requested.
- Google redirect URI: `https://agentxforces.com/api/auth/callback/google` (+ localhost for dev).
- Security model: [docs/SECURITY.md](docs/SECURITY.md). Mesh AEAD is **Phase 2** (`in_memory` today).

---

## Environment (Vercel)

**Domain:** agentxforces.com  

| Variable | Required | Purpose |
|----------|----------|---------|
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Prod | `https://agentxforces.com` |
| `AUTH_TRUST_HOST` | Non-local | `true` |
| `AUTH_REQUIRED` | No | Default open (`false`) |
| `AUTH_SECRET` | Only if gating | NextAuth |
| `GOOGLE_CLIENT_ID` / `SECRET` | Optional later | Google OAuth |
| `XAI_API_KEY` etc. | Optional | Server fallback; BYOK preferred |

**Future control plane:** `TOKEN_CONTROL_URL`, `TOKEN_CONTROL_SECRET`

---

## Naming (locked)

| Concept | Value |
|---------|--------|
| Product | **AgentForces** |
| Domain | **agentxforces.com** |
| Package / service ids | `agentforces` |
| GitHub SOT | `davidh38597hdh/AgentForces` |
| Chief handle | `@chief-agentforces` · `agentforces:` · `af:` |

---

## Do not

- Re-add email / magic-link auth unless explicitly requested.
- Hardcode API keys or put them in client bundles.
- Drop multi-edge or Ext cross-company / inter-network checks without a clear product reason.
- Loud marketing on the landing page.
- Assume Python `amep-network` is the Vercel app SOT.
- Rename product to AgentxForces / AgentForce without an explicit product decision.

---

## Verification before claiming done

1. `npm run build` succeeds (or `npx tsc --noEmit` when full build env is heavy).
2. If auth/portal touched: open mode → `/portal` and `/dashboard` without login; gated mode only when `AUTH_REQUIRED` + Google configured.
3. Portal project pick → `/dashboard?project=…` seeds graph via `buildProjectSeed`.
4. If graph/orchestrate/mesh touched: fan-out edges work; Ext-only cross/inter links; run produces log + outcome (+ hop log for mesh).
5. Domain strings in docs/UI stay **agentxforces.com**.

---

## Related handoffs

- Project queue / chief: `CONTEXT.md`
- Mesh merge map: `docs/MERGE.md`
- Multi-host deploy: `docs/DEPLOY.md`
- Original AgentxForce rules (historical): `reachdavidhuynh/AgentxForce` → `AGENTS.md`
