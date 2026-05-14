// Refs: SPEC.md §9 US-1.1 — Auth MFA, SPEC.md §2 Stack (Auth.js + SAML/OIDC MFA)
import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface User {
    accessToken?: string;
    platformRole?: string;
    permissions?: string[];
    displayName?: string;
  }
  interface Session {
    accessToken?: string;
    platformRole?: string;
    permissions?: string[];
    displayName?: string;
    userId?: string;
  }
}

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

// Décode le payload JWT (sans vérification de signature — côté client Next.js)
function decodeJwt(token: string): { exp?: number; permissions?: string[] } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// Renouvelle le token NestJS via un refresh silencieux
async function refreshAccessToken(token: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token["accessToken"]}`,
      },
    });
    if (!res.ok) return { ...token, error: "RefreshFailed" };
    const data = await res.json() as { access_token: string; permissions?: string[] };
    return {
      ...token,
      accessToken: data.access_token,
      permissions: data.permissions ?? token["permissions"],
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshFailed" };
  }
}

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

          if (!res.ok) {
            // Extraire le code d'erreur pour l'afficher dans le formulaire
            const err = await res.json().catch(() => ({})) as { message?: { code?: string } | string };
            const code = typeof err.message === "object" ? err.message?.code : undefined;
            // NextAuth encode l'erreur dans l'URL via error=CredentialsSignin
            // On ne peut pas passer de données custom — on lève une erreur avec le code
            throw new Error(code ?? "invalid_credentials");
          }

          const data = await res.json() as {
            access_token: string;
            user_id: string;
            email: string;
            display_name: string;
            app_role?: string;
            platform_role?: string;
            permissions?: string[];
          };
          const platformRole = data.platform_role ?? data.app_role;

          return {
            id: data.user_id,
            email: data.email,
            name: data.display_name,
            accessToken: data.access_token,
            platformRole,
            permissions: data.permissions ?? [],
            displayName: data.display_name,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Première connexion — on stocke tout
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          platformRole: user.platformRole,
          permissions: user.permissions,
          displayName: user.displayName,
        };
      }

      // Token encore valide ? (marge de 60s avant expiration)
      const decoded = decodeJwt(token["accessToken"] as string ?? "");
      const expiresAt = decoded?.exp ?? 0;
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt > now + 60) return token;

      // Token expiré ou proche — refresh silencieux
      return refreshAccessToken(token as Record<string, unknown>);
    },
    session({ session, token }) {
      session.accessToken = token["accessToken"] as string | undefined;
      session.platformRole = token["platformRole"] as string | undefined;
      session.permissions = Array.isArray(token["permissions"]) ? (token["permissions"] as string[]) : [];
      session.displayName = token["displayName"] as string | undefined;
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
