import { describe, it, expect } from "vitest";
import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { Controller, Get, type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MfaGuard } from "./mfa.guard.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { RequirePermissions } from "./permissions.decorator.js";
import { Public } from "./public.decorator.js";
import type { AuthUser, AppRole } from "./auth.types.js";

// Refs: SPEC.md §4, §11 US-1.1 — chaine de guards sans TenantGuard

@Controller("test")
class TestController {
  @Get("protected")
  getProtected() { return { ok: true }; }

  @Get("admin-only")
  @RequirePermissions("user.read")
  getAdminOnly() { return { admin: true }; }

  @Get("super-admin-only")
  @RequirePermissions("user.disable_mfa_other")
  getSuperAdminOnly() { return { super: true }; }

  @Get("trainer-or-admin")
  @RequirePermissions("module.create")
  getTrainerOrAdmin() { return { content: true }; }

  @Public()
  @Get("public")
  getPublic() { return { public: true }; }
}

function makeUser(app_role: AppRole, mfa_verified = true): AuthUser {
  const permissions = {
    super_admin: ["user.read", "user.disable_mfa_other", "module.create"],
    admin: ["user.read", "module.create"],
    trainer: ["module.create"],
    manager: [],
    learner: [],
  }[app_role];
  return { user_id: "u1", email: "test@holenek.fr", display_name: "Test", app_role, permissions: permissions as any, mfa_verified };
}

async function createApp(user: AuthUser | undefined): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [TestController],
    providers: [
      { provide: APP_GUARD, useClass: MfaGuard },
      { provide: APP_GUARD, useClass: PermissionsGuard },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use((req: any, _res: any, next: any) => { req.user = user; next(); });
  await app.init();
  return app;
}

async function req(app: INestApplication, path: string) {
  const server = app.getHttpServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    server.close();
  }
}

describe("Auth integration — guard chain", () => {
  it("permet l'acces a un user MFA verifie", async () => {
    const app = await createApp(makeUser("learner"));
    const res = await req(app, "/test/protected");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    await app.close();
  });

  it("rejette un user non authentifie (403)", async () => {
    const app = await createApp(undefined);
    const res = await req(app, "/test/protected");
    expect(res.status).toBe(403);
    await app.close();
  });

  it("rejette un user sans MFA verifie (403)", async () => {
    const app = await createApp(makeUser("learner", false));
    const res = await req(app, "/test/protected");
    expect(res.status).toBe(403);
    await app.close();
  });

  it("permet a admin d'acceder a la route admin-only", async () => {
    const app = await createApp(makeUser("admin"));
    const res = await req(app, "/test/admin-only");
    expect(res.status).toBe(200);
    await app.close();
  });

  it("bloque learner sur route admin-only (403)", async () => {
    const app = await createApp(makeUser("learner"));
    const res = await req(app, "/test/admin-only");
    expect(res.status).toBe(403);
    await app.close();
  });

  it("bloque manager sur route admin-only (403)", async () => {
    const app = await createApp(makeUser("manager"));
    const res = await req(app, "/test/admin-only");
    expect(res.status).toBe(403);
    await app.close();
  });

  it("permet super_admin d'acceder a la route super-admin-only", async () => {
    const app = await createApp(makeUser("super_admin"));
    const res = await req(app, "/test/super-admin-only");
    expect(res.status).toBe(200);
    await app.close();
  });

  it("bloque admin sur route super-admin-only (403)", async () => {
    const app = await createApp(makeUser("admin"));
    const res = await req(app, "/test/super-admin-only");
    expect(res.status).toBe(403);
    await app.close();
  });

  it("permet trainer sur route trainer-or-admin", async () => {
    const app = await createApp(makeUser("trainer"));
    const res = await req(app, "/test/trainer-or-admin");
    expect(res.status).toBe(200);
    await app.close();
  });

  it("bloque manager sur route trainer-or-admin (403)", async () => {
    const app = await createApp(makeUser("manager"));
    const res = await req(app, "/test/trainer-or-admin");
    expect(res.status).toBe(403);
    await app.close();
  });

  it("permet acces sans auth sur route public", async () => {
    const app = await createApp(undefined);
    const res = await req(app, "/test/public");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ public: true });
    await app.close();
  });
});

