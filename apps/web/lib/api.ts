// Refs: SPEC.md §9 — helper server-side pour construire l'ApiClient avec le token de session
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
  makeRoleApi,
  makeTrashApi,
  makeUserPermissionApi,
  makePermissionApi,
  makeAssignmentApi,
  makeSimulatorApi,
  makeAuditApi,
} from "@elearning/api-client";
import { auth } from "../auth";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

async function getSession() {
  return auth();
}

export async function getApiClient() {
  const session = await getSession();
  const token = (session as any)?.accessToken as string | undefined;

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
    role: makeRoleApi(client),
    trash: makeTrashApi(client),
    userPermission: makeUserPermissionApi(client),
    permission: makePermissionApi(client),
    assignment: makeAssignmentApi(client),
    simulator: makeSimulatorApi(client),
    audit: makeAuditApi(client),
  };
}

export async function getPlatformRole(): Promise<string> {
  const session = await getSession();
  return (session as any)?.platformRole as string ?? "";
}

export async function getPermissions(): Promise<string[]> {
  const session = await getSession();
  const perms = (session as any)?.permissions;
  return Array.isArray(perms) ? perms : [];
}

export async function getDisplayName(): Promise<string> {
  const session = await getSession();
  return (session as any)?.displayName as string ?? "";
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return (session as any)?.userId as string ?? session?.user?.email ?? null;
}
