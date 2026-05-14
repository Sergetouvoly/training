import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@elearning/domain";
import { PERMISSIONS_KEY } from "./auth.types.js";

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
