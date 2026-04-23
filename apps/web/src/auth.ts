import NextAuth, { type NextAuthResult } from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

export const { handlers, auth, signIn, signOut }: NextAuthResult = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env['KEYCLOAK_CLIENT_ID']!,
      clientSecret: process.env['KEYCLOAK_CLIENT_SECRET']!,
      issuer: `${process.env['KEYCLOAK_URL']}/realms/${process.env['KEYCLOAK_REALM']}`,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        if (account.access_token !== undefined) token['accessToken'] = account.access_token;
        if (account.refresh_token !== undefined) token['refreshToken'] = account.refresh_token;
        if (account.expires_at !== undefined) token['expiresAt'] = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      const accessToken = token['accessToken'];
      if (typeof accessToken === 'string') session.accessToken = accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});

// Extend the session type
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
  }
}
