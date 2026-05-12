// Refs: SPEC.md §9 US-1.1 — Auth MFA, SPEC.md §2 Stack (Auth.js + SAML/OIDC MFA)
import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface User {
    accessToken?: string;
    platformRole?: string;
    displayName?: string;
  }
  interface Session {
    accessToken?: string;
    platformRole?: string;
    displayName?: string;
    userId?: string;
  }
}

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

const result: NextAuthResult = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        mfa_code: { label: "Code MFA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: (credentials.email as string).trim(),
              password: (credentials.password as string).trim(),
              mfa_code: credentials.mfa_code,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json() as {
            access_token: string;
            user_id: string;
            email: string;
            display_name: string;
            platform_role: string;
          };

          return {
            id: data.user_id,
            email: data.email,
            name: data.display_name,
            accessToken: data.access_token,
            platformRole: data.platform_role,
            displayName: data.display_name,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.platformRole = user.platformRole;
        token.displayName = user.displayName;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.platformRole = token.platformRole as string | undefined;
      session.displayName = token.displayName as string | undefined;
      (session as any).userId = token.sub ?? undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
});

export const { handlers, auth, signIn, signOut } = result;
