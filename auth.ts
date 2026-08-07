import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isGoogleAuthConfigured } from '@/lib/auth-mode';

/**
 * NextAuth config. Google provider is registered only when env is present.
 * Product default: auth optional — see lib/auth-mode.ts.
 */
const providers = [];

if (isGoogleAuthConfigured()) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  // Avoid hard-failing when AUTH_SECRET is unset in open mode
  secret: process.env.AUTH_SECRET || 'agentforces-dev-open-mode-not-for-production',
  session: { strategy: 'jwt' },
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
