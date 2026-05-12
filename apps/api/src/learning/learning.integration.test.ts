import { describe, it, expect } from "vitest";
import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { LearningModule } from "./learning.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MfaGuard } from "../auth/mfa.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import type { AuthUser } from "../auth/auth.types.js";

// Refs: SPEC.md §9 US-1.2, US-1.5, R-1.3

function injectUser(user: AuthUser | undefined) {
  return (req: any, _res: any, next: any) => {
    req.user = user;
    next();
  };
}

function makePrismaMock() {
  const paths: any[] = [];
  const modules: any[] = [];
  const events: any[] = [];

  return {
    learningPath: {
      create: async (args: any) => {
        const p = { id: `lp-${paths.length + 1}`, ...args.data, created_at: new Date(), updated_at: new Date() };
        paths.push(p);
        return p;
      },
      findFirst: async (args: any) => paths.find((p) => p.id === args.where.id) ?? null,
      findMany: async () => [...paths].reverse(),
      delete: async (args: any) => {
        const idx = paths.findIndex((p) => p.id === args.where.id);
        return idx >= 0 ? paths.splice(idx, 1)[0] : null;
      },
    },
    module: {
      create: async (args: any) => {
        const m = { id: `m-${modules.length + 1}`, ...args.data, created_at: new Date(), updated_at: new Date() };
        modules.push(m);
        return m;
      },
      findFirst: async (args: any) => modules.find((m) => m.id === args.where.id) ?? null,
      findMany: async () => [...modules].reverse(),
    },
    domainEvent: {
      create: async (args: any) => {
        const e = { ...args.data, occurred_at: new Date() };
        events.push(e);
        return e;
      },
      findMany: async (args: any) => {
        const name = args?.where?.event_name;
        const learnerId = args?.where?.payload?.path?.[0] === "learner_id"
          ? args?.where?.payload?.equals
          : undefined;
        return events.filter((e) => {
          if (name && e.event_name !== name) return false;
          if (learnerId && e.payload?.learner_id !== learnerId) return false;
          return true;
        });
      },
    },
    $connect: async () => {},
    $disconnect: async () => {},
    _paths: paths,
    _modules: modules,
    _events: events,
  };
}

async function createApp(user: AuthUser | undefined, prismaMock?: any) {
  const mock = prismaMock ?? makePrismaMock();
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule, LearningModule],
    providers: [
      { provide: APP_GUARD, useClass: MfaGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(mock)
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(injectUser(user));
  await app.init();
  return { app, prismaMock: mock };
}

async function req(app: INestApplication, method: string, path: string, body?: any) {
  const server = app.getHttpServer();
  await new Promise<void>((r) => server.listen(0, r));
  const port = server.address().port;
  try {
    const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`http://127.0.0.1:${port}${path}`, opts);
    const resBody = await res.json().catch(() => null);
    return { status: res.status, body: resBody };
  } finally {
    server.close();
  }
}

const admin: AuthUser = { user_id: "u1", email: "admin@holenek.fr", display_name: "Admin", platform_role: "admin", mfa_verified: true };
const learner: AuthUser = { user_id: "u2", email: "l@holenek.fr", display_name: "Learner", platform_role: "learner", mfa_verified: true };

describe("Learning integration", () => {
  it("admin creates a learning path (US-1.5)", async () => {
    const { app } = await createApp(admin);
    const res = await req(app, "POST", "/learning/paths", {
      title_fr: "Parcours Sécu", target_role: "all", module_sequence: [],
    });
    expect(res.status).toBe(201);
    expect(res.body.title_fr).toBe("Parcours Sécu");
    await app.close();
  });

  it("learner is rejected from creating a learning path (403)", async () => {
    const { app } = await createApp(learner);
    const res = await req(app, "POST", "/learning/paths", {
      title_fr: "X", target_role: "all", module_sequence: [],
    });
    expect(res.status).toBe(403);
    await app.close();
  });

  it("any authenticated user can list paths", async () => {
    const { app } = await createApp(learner);
    const res = await req(app, "GET", "/learning/paths");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    await app.close();
  });

  it("admin creates a module with status draft", async () => {
    const { app } = await createApp(admin);
    const res = await req(app, "POST", "/learning/modules", {
      version: "1.0", version_hash: "abc", title_fr: "Module Intro", competence_ids: ["c1"],
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    await app.close();
  });

  it("saves progression and emits ProgressUpdated event (US-1.2, R-1.3)", async () => {
    const mock = makePrismaMock();
    mock._modules.push({
      id: "m-existing", version: "1.0", version_hash: "h1",
      title_fr: "Mod", competence_ids: [],
    });

    const { app, prismaMock } = await createApp(learner, mock);
    const res = await req(app, "POST", "/learning/progress", {
      learner_id: "l1", module_id: "m-existing", module_version_hash: "h1", progress_percent: 75,
    });

    expect(res.status).toBe(201);
    expect(res.body.progress_percent).toBe(75);

    expect(prismaMock._events.length).toBe(1);
    expect(prismaMock._events[0].event_name).toBe("ProgressUpdated");
    expect(prismaMock._events[0].payload.progress_percent).toBe(75);
    await app.close();
  });

  it("unauthenticated request returns 403", async () => {
    const { app } = await createApp(undefined);
    const res = await req(app, "GET", "/learning/paths");
    expect(res.status).toBe(403);
    await app.close();
  });
});
