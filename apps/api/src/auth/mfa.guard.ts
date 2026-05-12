import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY, type AuthUser } from "./auth.types.js";

/**
 * Ensures MFA has been verified for the current session.
 * Public endpoints bypass this guard.
 * Refs: SPEC.md §9 US-1.1 (Auth MFA)
 */
@Injectable()
export class MfaGuard implements CanActivate {
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

    if (!user.mfa_verified) {
      throw new ForbiddenException("MFA verification required");
    }

    return true;
  }
}
