import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "./auth.types.js";

/**
 * Extracts the full AuthUser from the request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    if (!user) {
      throw new Error("CurrentUser used without authenticated user");
    }
    return user;
  },
);
