/**
 * Auth mode — Google OAuth when env is configured.
 * - Configured: show Google button; gate portal/dashboard unless AUTH_REQUIRED=false
 * - Not configured: open guest access
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
 * Default: on when Google is configured.
 * Set AUTH_REQUIRED=false to allow guests even with Google env present.
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
