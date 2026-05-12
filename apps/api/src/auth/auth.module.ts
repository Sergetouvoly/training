// Refs: SPEC.md §11 US-1.1
import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module.js";
import { MfaGuard } from "./mfa.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { JwtMiddleware } from "./jwt.middleware.js";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env["JWT_SECRET"] ?? "dev-secret-change-in-prod",
      signOptions: { expiresIn: (process.env["JWT_EXPIRY"] ?? "1h") as "1h" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    Reflector,
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new MfaGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RolesGuard(reflector),
      inject: [Reflector],
    },
  ],
  exports: [JwtModule, Reflector],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes("*");
  }
}
