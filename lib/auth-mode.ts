/**
 * Auth mode — Google OAuth.
 * Button is always shown in UI; provider registers when client id/secret exist.
 */

/** True when Google OAuth client credentials are set (AUTH_SECRET optional; has fallback). */
export function isGoogleAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

/**
 * Whether portal/dashboard require a session.
 * Default: on when Google client credentials exist.
 * Set AUTH_REQUIRED=false to allow guests with Google still available.
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
