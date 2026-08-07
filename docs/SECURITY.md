# AgentForces security model

**Domain:** https://agentxforces.com  
**Repo:** davidh38597hdh/AgentForces  
**Last updated:** 2026-08-07

---

## What is protected today (Phase 1)

| Control | Behavior |
|---------|----------|
| **Production auth** | Portal, dashboard, and mesh APIs require a Google session |
| **No guest mesh in prod** | `isAuthRequired()` is always true when `VERCEL_ENV=production` |
| **Fail closed** | Production needs `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Session cookies** | Production: `__Secure-…`, `httpOnly`, `secure`, `sameSite=lax` |
| **Security headers** | HSTS, nosniff, DENY frame, Referrer-Policy, Permissions-Policy, CSP baseline |
| **API keys** | Never logged; errors redacted; BYOK stays in browser until request |
| **Debug endpoints** | `/api/auth/providers-status` requires session in production |

Landing page (`/`) remains public marketing.

---

## What is *not* full AMEP crypto yet (Phase 2)

| Layer | Status |
|-------|--------|
| Inter-agent hop AEAD (ChaCha20-Poly1305) | **Not shipped** — bus is `in_memory` |
| Ed25519 / X25519 handshake | Python `amep-network` only |
| Capability tokens / sandbox isolation | Roadmap |
| Encrypt BYOK at rest in localStorage | Not shipped |

UI may show **AMEP/1** protocol labels and epoch ids; transport remains **`in_memory`** until SecureBus is ported. Do not claim sealed mesh hops until `MESH_TRANSPORT = 'amep_aead'`.

---

## Threat model (summary)

| Zone | Trust |
|------|--------|
| Browser | User device; XSS can steal BYOK from localStorage |
| Vercel | TLS terminated; env secrets; serverless logs |
| LLM providers | Receive prompts/context you send (BYOK or server keys) |
| Google OAuth | Identity provider |

---

## Required production environment

| Variable | Notes |
|----------|--------|
| `AUTH_SECRET` | Strong random; **required** |
| `GOOGLE_CLIENT_ID` | Not `GOOGLE_CLIENT` |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud |
| `AUTH_URL` | `https://agentxforces.com` |
| `NEXT_PUBLIC_APP_URL` | `https://agentxforces.com` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_REQUIRED` | Optional in prod (auth forced anyway) |

Google redirect: `https://agentxforces.com/api/auth/callback/google`

---

## Deploy security checklist

1. [ ] `GOOGLE_CLIENT_ID` spelling correct  
2. [ ] All secrets on **Production**  
3. [ ] Redeploy after env change  
4. [ ] Private window: `/portal` → login redirect  
5. [ ] Signed-in: mesh run works  
6. [ ] `curl -I https://agentxforces.com` shows HSTS / nosniff  
7. [ ] `/api/auth/providers-status` without cookie → 401 in prod  

---

## Incident response

If `AUTH_SECRET` or Google client secret leaked: rotate in Google Cloud + Vercel, force re-login (new secret invalidates old sessions), redeploy.
