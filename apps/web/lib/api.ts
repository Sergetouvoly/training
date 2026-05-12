// Refs: SPEC.md §9 — helper server-side pour construire l'ApiClient avec le token de session
import { cookies } from "next/headers";
import { getToken } from "@auth/core/jwt";
import {
  createApiClient,
  makeLearningApi,
  makeAssessmentApi,
  makePassportApi,
  makeUserApi,
  makeAdminApi,
  makeCompetenceApi,
  makeConfigApi,
  makeNotificationApi,
} from "@elearning/api-client";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

async function getJwt() {
  const cookieStore = await cookies();
  const cookieName = cookieStore.has("__Secure-authjs.session-token")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const rawCookie = cookieStore.get(cookieName)?.value ?? "";

  return getToken({
    req: new Request("http://n", { headers: { cookie: `${cookieName}=${rawCookie}` } }),
    secret: process.env["AUTH_SECRET"] ?? "",
    salt: cookieName,
  });
}

export async function getApiClient() {
  const jwt = await getJwt();
  const token = (jwt as any)?.accessToken as string | undefined;

  const client = createApiClient({
    baseUrl: API_URL,
    getToken: () => token ?? null,
  });

  return {
    learning: makeLearningApi(client),
    assessment: makeAssessmentApi(client),
    passport: makePassportApi(client),
    user: makeUserApi(client),
    admin: makeAdminApi(client),
    competence: makeCompetenceApi(client),
    config: makeConfigApi(client),
    notification: makeNotificationApi(client),
  };
}

export async function getPlatformRole(): Promise<string> {
  const jwt = await getJwt();
  return (jwt as any)?.platformRole as string ?? "";
}

export async function getDisplayName(): Promise<string> {
  const jwt = await getJwt();
  return (jwt as any)?.displayName as string ?? "";
}

export async function getUserId(): Promise<string | null> {
  const jwt = await getJwt();
  return (jwt as any)?.sub as string ?? null;
}
