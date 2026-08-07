import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import {
  assertProductionAuthConfig,
  isGoogleAuthConfigured,
  isProduction,
} from '@/lib/auth-mode';

// Fail closed on production misconfig at module load
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

const useSecureCookies = isProduction();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret:
    authSecret ||
    (isProduction()
      ? undefined // NextAuth will error without secret in prod — intentional
      : 'agentforces-dev-open-mode-not-for-production'),
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  cookies: useSecureCookies
    ? {
        sessionToken: {
          name: `__Secure-authjs.session-token`,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: true,
          },
        },
      }
    : undefined,
  pages: {
    signIn: '/login',
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
});

export { isGoogleAuthConfigured };
