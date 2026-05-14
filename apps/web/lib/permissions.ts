import type { Permission } from "@elearning/domain";

export type { Permission };

export function can(
  permissions: ReadonlyArray<string> | undefined,
  permission: Permission,
): boolean {
  if (!permissions?.length) return false;
  return permissions.includes(permission);
}

export function canAny(
  permissions: ReadonlyArray<string> | undefined,
  required: ReadonlyArray<Permission>,
): boolean {
  if (!permissions?.length) return false;
  return required.some((p) => permissions.includes(p));
}

export function canAll(
  permissions: ReadonlyArray<string> | undefined,
  required: ReadonlyArray<Permission>,
): boolean {
  if (!permissions?.length) return false;
  return required.every((p) => permissions.includes(p));
}

export const canAccessAdmin = (p?: readonly string[]) => can(p, "view.admin");
export const canAccessTrainerSpace = (p?: readonly string[]) => can(p, "view.trainer_space");
export const canAccessManagerSpace = (p?: readonly string[]) => can(p, "view.manager_space");
