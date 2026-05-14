/**
 * Auth types — Refs: SPEC.md §5 (AppRole), §11 US-1.1
 * Mono-organisation : pas de tenant_id dans le JWT.
 */

import type { Permission } from "@elearning/domain";

export const APP_ROLES = ["super_admin", "admin", "trainer", "manager", "learner"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export interface AuthUser {
  readonly user_id: string;
  readonly email: string;
  readonly display_name: string;
  readonly app_role: AppRole;
  readonly permissions: ReadonlyArray<Permission>;
  readonly mfa_verified: boolean;
}

export interface SessionPayload {
  readonly user_id: string;
  readonly email: string;
  readonly display_name: string;
  readonly app_role: AppRole;
  readonly permissions: ReadonlyArray<Permission>;
  readonly mfa_verified: boolean;
  readonly iat: number;
  readonly exp: number;
}

export const PERMISSIONS_KEY = "permissions";
export const IS_PUBLIC_KEY = "isPublic";
