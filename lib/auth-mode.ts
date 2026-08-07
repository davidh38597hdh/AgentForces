/**
 * Auth mode — Google OAuth is optional / not product-ready yet.
 * When disabled, portal + dashboard are open (no login gate).
 */

/** True only when Google OAuth env is fully configured. */
export function isGoogleAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim() &&
    process.env.AUTH_SECRET?.trim()
  );
}

/**
 * Whether protected routes require a session.
 * Default: off until Google is configured, unless AUTH_REQUIRED=true.
 * Set AUTH_REQUIRED=false to force open even with Google env present.
 */
export function isAuthRequired(): boolean {
  if (process.env.AUTH_REQUIRED === 'false' || process.env.AUTH_REQUIRED === '0') {
    return false;
  }
  if (process.env.AUTH_REQUIRED === 'true' || process.env.AUTH_REQUIRED === '1') {
    return true;
  }
  return isGoogleAuthConfigured();
}
