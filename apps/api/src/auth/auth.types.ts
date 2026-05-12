/**
 * Auth types — Refs: SPEC.md §5 (PlatformRole), §11 US-1.1
 * Mono-organisation : pas de tenant_id dans le JWT.
 */

export const PLATFORM_ROLES = ["super_admin", "admin", "trainer", "manager", "learner"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export interface AuthUser {
  readonly user_id: string;
  readonly email: string;
  readonly display_name: string;
  readonly platform_role: PlatformRole;
  readonly mfa_verified: boolean;
}

export interface SessionPayload {
  readonly user_id: string;
  readonly email: string;
  readonly display_name: string;
  readonly platform_role: PlatformRole;
  readonly mfa_verified: boolean;
  readonly iat: number;
  readonly exp: number;
}

export const ROLES_KEY = "roles";
export const IS_PUBLIC_KEY = "isPublic";
