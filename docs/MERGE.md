# Merge: Orchestrate / amep-network → AgentForce

**Date:** 2026-08-07  
**Product surface:** AgentForce (`reachdavidhuynh/AgentxForce`, agentxforce.com)  
**Concept sources:**
- Orchestrate / Multi-Agent-System — multi-network teams + MessageBus + chief routing  
- amep-network — AMEP/1 protocol labels, SecureBus shape, cells, epoch sessions, sandboxes  

## Thesis

**AgentForce** is the customer-facing SaaS (Next.js / Vercel): graph UX, BYOK, auth, portal.  
**Orchestrate + AMEP** supply the mesh architecture: networks, chief, inter-network bus, protocol versioning, isolation roadmap.

```
Customer UI (AgentForce portal + dashboard)
        │
        ▼
Chief router  (@chief-agentforce)  ── keyword route → primary network
        │
        ▼
Networks / cells  (research | computation | creative | custom)
  intra-network edges = normal graph links
  inter-network edges = Ext interfaces + bus envelopes
        │
        ▼
MessageBus  (InMemory now → AMEP AEAD SecureBus later)
        │
        ▼
LLM turns (Vercel AI SDK) · future: sandbox execution plane
```

## What landed in this merge

| Concept | AgentForce location | Status |
|---------|---------------------|--------|
| AMEP/1 labels + epoch session | `lib/mesh/protocol.ts` | **shipped** (metadata) |
| MessageBus + envelopes | `lib/mesh/message-bus.ts` | **shipped** (in-memory) |
| Network catalog R/C/C | `lib/mesh/networks.ts` | **shipped** |
| Chief route + dispatch | `lib/mesh/chief.ts` | **shipped** |
| Mesh runner + hop log | `lib/mesh/run-mesh.ts` | **shipped** |
| Orchestrate portal seed | `lib/seed-graph.ts` · `projects.ts` | **shipped** |
| Dashboard hop / session UI | `app/dashboard/page.tsx` | **shipped** |
| Full AEAD SecureBus | Python `amep-network/bus/secure_bus.py` | **not ported** (interface-ready) |
| Daytona / Modal sandboxes | amep-network providers | **roadmap** |
| Customer portal grants (named customers) | Orchestrate portal_store | **roadmap** |

## Layer ownership

| Layer | Source of truth |
|-------|-----------------|
| Product UX + deploy | **AgentForce** (this repo) |
| Protocol specs + crypto suite | `amep-network/protocol/` + `~/.grok/network/` |
| Hard isolation / sandboxes | amep-network runtime providers (future API behind AgentForce) |

Do not treat `agentforge` or Streamlit Orchestrate as product source of truth.

## Next engineering slices

1. Optional server SecureBus adapter (call control plane or WASM crypto).  
2. Execution plane: map `computation` network tools → sandboxed `code_exec`.  
3. Named customer grants on `/portal` (Orchestrate portal_store model).  
4. Dual-license / IP policy before commercial packaging of combined code.

## Autonomy note

Major product naming, pricing, and crypto-enforcement defaults still need product owner input. Implementation of mesh concepts inside AgentForce may proceed autonomously.
