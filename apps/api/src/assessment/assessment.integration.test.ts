import { describe, it, expect } from "vitest";
import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AssessmentModule } from "./assessment.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MfaGuard } from "../auth/mfa.guard.js";
import { PermissionsGuard } from "../auth/permissions.guard.js";
import type { AuthUser } from "../auth/auth.types.js";

// Refs: SPEC.md §9 US-1.3, R-1.2, R-1.3

function injectUser(user: AuthUser | undefined) {
  return (req: any, _res: any, next: any) => {
    req.user = user;
    next();
  };
}

function makePrismaMock() {
  const items: any[] = [];
  const stamps: any[] = [];
  const events: any[] = [];

  return {
    evaluationItem: {
      create: async (args: any) => {
        const i = { id: `item-${items.length + 1}`, ...args.data, created_at: new Date() };
        items.push(i);
        return i;
      },
      findFirst: async (args: any) => items.find((i) => i.id === args.where?.id) ?? null,
      findMany: async (args: any) => {
        const bankId = args.where?.bank_id;
        return bankId ? items.filter((i) => i.bank_id === bankId) : items;
      },
    },
    competence: {
      findFirst: async (args: any) => ({ id: args.where.id }),
    },
    module: {
      findFirst: async (args: any) => ({ id: args.where.id }),
    },
    appConfig: {
      findUnique: async () => ({ key: "stamp_validity_months", value: 12 }),
    },
    stamp: {
      create: async (args: any) => {
        const s = { id: `stamp-${stamps.length + 1}`, ...args.data };
        stamps.push(s);
        return s;
      },
      count: async () => 0,
    },
    domainEvent: {
      create: async (args: any) => {
        const e = { ...args.data, occurred_at: new Date() };
        events.push(e);
        return e;
      },
    },
    $connect: async () => {},
    $disconnect: async () => {},
    _items: items,
    _stamps: stamps,
    _events: events,
  };
}

async function createApp(user: AuthUser | undefined, prismaMock?: any) {
  const mock = prismaMock ?? makePrismaMock();
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule, AssessmentModule],
    providers: [
      { provide: APP_GUARD, useClass: MfaGuard },
      { provide: APP_GUARD, useClass: PermissionsGuard },
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

const admin: AuthUser = { user_id: "u1", email: "admin@holenek.fr", display_name: "Admin", app_role: "admin", permissions: ["user.read", "learning_path.create", "module.create", "evaluation_item.create"], mfa_verified: true };
const learner: AuthUser = { user_id: "u2", email: "l@holenek.fr", display_name: "Learner", app_role: "learner", permissions: [], mfa_verified: true };
const trainer: AuthUser = { user_id: "u3", email: "t@holenek.fr", display_name: "Trainer", app_role: "trainer", permissions: ["evaluation_item.create"], mfa_verified: true };

describe("Assessment integration", () => {
  it("admin creates items, learner evaluates → Stamp + CompetenceValidated (US-1.3)", async () => {
    const mock = makePrismaMock();

    const { app: adminApp } = await createApp(admin, mock);
    await req(adminApp, "POST", "/assessment/items", {
      bank_id: "b1", format: "qcm_single", difficulty: 1, bloom_level: 1,
      concept_tags: ["sec"],
      content: { question_fr: "Q1?", choices: [{ label: "A", is_correct: true }, { label: "B", is_correct: false }] },
    });
    await adminApp.close();

    const { app: learnerApp, prismaMock: pm } = await createApp(learner, mock);
    const res = await req(learnerApp, "POST", "/assessment/evaluate", {
      learner_id: "l1", competence_id: "c1", bank_id: "b1", module_id: "m1",
      module_version_hash: "h1",
      answers: [{ item_id: "item-1", answer: "A" }],
    });

    expect(res.status).toBe(201);
    expect(res.body.performance_score).toBe(100);
    expect(res.body.state).toBe("green");
    expect(res.body.stamp_id).toBeTruthy();
    expect(pm._stamps.length).toBe(1);

    const cvEvent = pm._events.find((e: any) => e.event_name === "CompetenceValidated");
    expect(cvEvent).toBeTruthy();
    expect(cvEvent.payload.performance_score).toBe(100);
    await learnerApp.close();
  });

  it("learner is rejected from creating items (403)", async () => {
    const { app } = await createApp(learner);
    const res = await req(app, "POST", "/assessment/items", {
      bank_id: "b1", format: "qcm_single", difficulty: 1, bloom_level: 1,
      concept_tags: [], content: { question_fr: "Q?" },
    });
    expect(res.status).toBe(403);
    await app.close();
  });

  it("trainer can create items (admin/trainer/super_admin allowed)", async () => {
    const mock = makePrismaMock();
    const { app } = await createApp(trainer, mock);
    const res = await req(app, "POST", "/assessment/items", {
      bank_id: "b1", format: "true_false", difficulty: 2, bloom_level: 1,
      concept_tags: [], content: { question_fr: "Q?", correct_answer: "true" },
    });
    expect(res.status).toBe(201);
    await app.close();
  });

  it("unauthenticated request returns 403", async () => {
    const { app } = await createApp(undefined);
    const res = await req(app, "GET", "/assessment/items/bank/b1");
    expect(res.status).toBe(403);
    await app.close();
  });
});

