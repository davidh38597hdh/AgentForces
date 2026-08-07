/**
 * Auth mode — production always requires Google session (no guest mesh).
 * Local/dev may allow guest when Google env is missing.
 */

/** Skip fail-closed during `next build` (NODE_ENV=production but not a live server). */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * True when running as a live production server.
 * - Vercel production
 * - Docker/Node with NODE_ENV=production (unless ALLOW_GUEST=true)
 * - FORCE_PROD_AUTH=true for tests
 */
export function isProduction(): boolean {
  if (isBuildPhase()) return false;
  if (process.env.FORCE_PROD_AUTH === 'true') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
    return false;
  }
  if (process.env.NODE_ENV === 'production') {
    // Standalone Docker / node start — treat as prod unless guest explicitly allowed
    return process.env.ALLOW_GUEST !== 'true';
  }
  return false;
}

/** True when Google OAuth client credentials are set. */
export function isGoogleAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

/**
 * Whether protected routes / mesh APIs require a session.
 * - Production: always true (guest mesh disabled).
 * - Non-prod: true when Google configured, or AUTH_REQUIRED=true.
 */
export function isAuthRequired(): boolean {
  if (isProduction()) {
    return true;
  }
  if (process.env.AUTH_REQUIRED === 'false' || process.env.AUTH_REQUIRED === '0') {
    return false;
  }
  if (process.env.AUTH_REQUIRED === 'true' || process.env.AUTH_REQUIRED === '1') {
    return true;
  }
  return isGoogleAuthConfigured();
}

/** Production must have signing secret + Google OAuth (fail closed). */
export function assertProductionAuthConfig(): void {
  if (!isProduction()) return;
  const missing: string[] = [];
  if (!process.env.AUTH_SECRET?.trim()) missing.push('AUTH_SECRET');
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) missing.push('GOOGLE_CLIENT_SECRET');
  if (missing.length) {
    throw new Error(
      `AgentForces production auth misconfigured. Set: ${missing.join(', ')}. ` +
        `Use GOOGLE_CLIENT_ID (not GOOGLE_CLIENT).`
    );
  }
}
