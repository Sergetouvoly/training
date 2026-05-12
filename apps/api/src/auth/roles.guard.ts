// Refs: SPEC.md §4, §7 — RolesGuard sur tous les endpoints proteges
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, IS_PUBLIC_KEY, type PlatformRole, type AuthUser } from "./auth.types.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // authentifie mais pas de role specifique requis
    }

    if (!requiredRoles.includes(user.platform_role)) {
      throw new ForbiddenException(`Required role(s): ${requiredRoles.join(", ")}`);
    }

    return true;
  }
}
