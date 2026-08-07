import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * NextAuth — Google provider when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
 * AUTH_SECRET recommended in production; fallback only for local open mode.
 */
const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

const providers = [];

if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET?.trim() || 'agentforces-dev-open-mode-not-for-production',
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
