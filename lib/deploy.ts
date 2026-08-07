/**
 * Deploy-target helpers — Vercel primary, Docker/Fly/Render/Railway secondary.
 */

export type DeployTarget =
  | 'vercel'
  | 'fly'
  | 'docker'
  | 'railway'
  | 'render'
  | 'other'
  | 'unknown';

export function getDeployTarget(): DeployTarget {
  const explicit = (process.env.DEPLOY_TARGET || '').toLowerCase();
  if (
    explicit === 'vercel' ||
    explicit === 'fly' ||
    explicit === 'docker' ||
    explicit === 'railway' ||
    explicit === 'render' ||
    explicit === 'other'
  ) {
    return explicit;
  }
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') return 'vercel';
  if (process.env.FLY_APP_NAME || process.env.FLY_REGION) return 'fly';
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) return 'railway';
  if (process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID) return 'render';
  return 'unknown';
}

/** Public origin for links / metadata (no trailing slash). */
export function getPublicAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  for (const c of candidates) {
    if (c?.trim()) return c.trim().replace(/\/$/, '');
  }
  // Production product domain when env is unset (local dev uses localhost via NODE_ENV)
  if (process.env.NODE_ENV === 'production') return 'https://agentxforces.com';
  return 'http://localhost:3000';
}

export function isVercel(): boolean {
  return getDeployTarget() === 'vercel' || process.env.VERCEL === '1';
}
