// Refs: SPEC.md §11 US-1.1 — verifie le JWT Bearer et popule request.user
import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request, Response, NextFunction } from "express";
import type { SessionPayload, AuthUser } from "./auth.types.js";

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwt.verify<SessionPayload>(token);
        const user: AuthUser = {
          user_id: payload.user_id,
          email: payload.email,
          display_name: payload.display_name,
          app_role: payload.app_role,
          permissions: payload.permissions,
          mfa_verified: payload.mfa_verified,
        };
        (req as Request & { user: AuthUser }).user = user;
      } catch {
        // Token invalide — request.user reste undefined, PermissionsGuard rejettera
      }
    }
    next();
  }
}

