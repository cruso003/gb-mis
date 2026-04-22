import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env['KEYCLOAK_CLIENT_ID']!,
      clientSecret: process.env['KEYCLOAK_CLIENT_SECRET']!,
      issuer: `${process.env['KEYCLOAK_URL']}/realms/${process.env['KEYCLOAK_REALM']}`,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the Keycloak access_token in the JWT so we can forward it to the API
      if (account) {
        token['accessToken'] = account.access_token;
        token['refreshToken'] = account.refresh_token;
        token['expiresAt'] = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token['accessToken'] as string | undefined;
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
