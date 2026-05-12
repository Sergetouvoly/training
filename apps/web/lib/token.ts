// Helper partagé — récupère le bearer token depuis le cookie de session Next-Auth
import { getToken } from "@auth/core/jwt";
import { cookies } from "next/headers";

export async function getBearerToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookieName = cookieStore.has("__Secure-authjs.session-token")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const rawCookie = cookieStore.get(cookieName)?.value ?? "";
  const jwt = await getToken({
    req: new Request("http://n", { headers: { cookie: `${cookieName}=${rawCookie}` } }),
    secret: process.env["AUTH_SECRET"] ?? "",
    salt: cookieName,
  });
  return (jwt as any)?.accessToken as string | undefined;
}
