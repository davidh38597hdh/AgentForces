import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
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
