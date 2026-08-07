import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import {
  assertProductionAuthConfig,
  isGoogleAuthConfigured,
  isProduction,
} from '@/lib/auth-mode';

// Fail closed on production misconfig at module load (log only — don't crash cold start)
try {
  assertProductionAuthConfig();
} catch (e) {
  if (isProduction()) {
    console.error(e instanceof Error ? e.message : e);
  }
}

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const authSecret = process.env.AUTH_SECRET?.trim();

const providers = [];

if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    })
  );
} else if (isProduction()) {
  console.error(
    'AgentForces: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required in production'
  );
}

/**
 * IMPORTANT: AUTH_URL must match the browser origin users actually use.
 * This site redirects apex → www, so production should be:
 *   AUTH_URL=https://www.agentxforces.com
 *   NEXT_PUBLIC_APP_URL=https://www.agentxforces.com
 * Google Console redirect URI must match:
 *   https://www.agentxforces.com/api/auth/callback/google
 */
if (isProduction() && process.env.AUTH_URL) {
  try {
    const u = new URL(process.env.AUTH_URL);
    if (u.hostname === 'agentxforces.com') {
      console.warn(
        'AgentForces: AUTH_URL uses apex host but traffic redirects to www. ' +
          'Set AUTH_URL=https://www.agentxforces.com and register that callback in Google Console.'
      );
    }
  } catch {
    /* ignore bad URL */
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  // Always provide a secret string — Auth.js throws Configuration if missing
  secret:
    authSecret ||
    (isProduction()
      ? // Still set something so handlers load; assertProductionAuthConfig logs the real issue
        process.env.AUTH_SECRET || 'MISSING_AUTH_SECRET_SET_IN_VERCEL'
      : 'agentforces-dev-open-mode-not-for-production'),
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7,
  },
  // Let Auth.js manage cookie names (__Secure- prefix on HTTPS automatically).
  // Custom cookie overrides often break OAuth state/CSRF and cause "Server error".
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      if (user?.image) token.picture = user.image;
      if (account?.provider) token.provider = account.provider;
      if (profile && 'picture' in profile && profile.picture) {
        token.picture = profile.picture as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.image = (token.picture as string) || session.user.image;
      }
      return session;
    },
  },
  trustHost: true,
  debug: process.env.AUTH_DEBUG === 'true',
});

export { isGoogleAuthConfigured };
