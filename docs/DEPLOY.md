# Deploy AgentForces

| Target | Role | How |
|--------|------|-----|
| **Vercel** | Primary SaaS | Connect GitHub, set env, deploy |
| **Fly.io** | Secondary production (Docker) | `fly deploy` + secrets |
| **Docker** | Self-host / any K8s / VPS | `docker compose up --build` |
| **Render** | Alternate Docker PaaS | Blueprint `render.yaml` |
| **Railway** | Alternate Docker PaaS | Dockerfile auto-detect |

## Shared requirements

Copy [`.env.example`](../.env.example) and set at least:

| Variable | Notes |
|----------|--------|
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | `https://agentxforces.com` (no trailing slash) |
| `AUTH_TRUST_HOST=true` | **Required** on non-Vercel / reverse proxies |
| `AUTH_SECRET` | **Required in production** |
| `GOOGLE_CLIENT_ID` | **Required in production** (not `GOOGLE_CLIENT`) |
| `GOOGLE_CLIENT_SECRET` | **Required in production** |
| Optional provider keys | `XAI_API_KEY`, etc. (BYOK still works in UI) |

**Auth:** Production **always** requires Google login for portal/dashboard/mesh APIs. Local may use guest. Full security notes: [SECURITY.md](./SECURITY.md).

Health check (all non-Vercel targets): `GET /api/health` → `{ ok: true, ... }`.

Next.js is built with **`output: 'standalone'`** so the same image runs on Fly, Render, Railway, and plain Docker. Vercel continues to use its own builder.

---

## 1. Vercel (primary)

1. Import `davidh38597hdh/AgentForces` (or your fork).
2. Set env vars in the Vercel project.
3. Deploy. Domain: [agentxforces.com](https://agentxforces.com).

Optional: `DEPLOY_TARGET=vercel` (auto-detected via `VERCEL=1`).

---

## 2. Fly.io (secondary)

```bash
# one-time
fly auth login
fly apps create agentforces   # or edit app name in fly.toml

fly secrets set \
  AUTH_SECRET="$(openssl rand -base64 32)" \
  AUTH_URL="https://agentforces.fly.dev" \
  NEXT_PUBLIC_APP_URL="https://agentforces.fly.dev" \
  AUTH_TRUST_HOST=true \
  GOOGLE_CLIENT_ID=... \
  GOOGLE_CLIENT_SECRET=... \
  XAI_API_KEY=...

fly deploy
```

Config: [`fly.toml`](../fly.toml). Change `app` and `primary_region` as needed.

---

## 3. Docker Compose (local / VPS)

```bash
cp .env.example .env
# edit .env — set AUTH_SECRET, AUTH_URL, Google keys

docker compose up --build
# → http://localhost:3000
```

Production VPS: point a reverse proxy (Caddy/nginx) at port 3000, set `AUTH_URL` to the public HTTPS URL, TLS terminate at the proxy.

---

## 4. Render

1. New → Blueprint → select this repo (uses [`render.yaml`](../render.yaml)).
2. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the Render service URL.
3. Add Google + API secrets in the dashboard.

---

## 5. Railway

1. New project → Deploy from GitHub.
2. Railway detects `Dockerfile`.
3. Set the same env vars; set `DEPLOY_TARGET=railway`.
4. Generate domain; mirror into `AUTH_URL` / `NEXT_PUBLIC_APP_URL`.

---

## Runtime detection

`lib/deploy.ts` exposes `getDeployTarget()` and `getPublicAppUrl()` for logs and metadata. Set `DEPLOY_TARGET` explicitly when auto-detect is wrong.

## What not to put in the image

Secrets stay in platform env / `fly secrets` / Compose `env_file` — never bake `.env` into the image (see `.dockerignore`).
