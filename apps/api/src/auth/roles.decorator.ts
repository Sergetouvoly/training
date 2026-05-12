import { SetMetadata } from "@nestjs/common";
import { ROLES_KEY, type PlatformRole } from "./auth.types.js";

// Refs: SPEC.md §7 — restreindre un endpoint a certains platform_roles
export const Roles = (...roles: PlatformRole[]) => SetMetadata(ROLES_KEY, roles);
