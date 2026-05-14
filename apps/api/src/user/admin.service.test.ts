import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { AdminService } from "./admin.service.js";

// Refs: SPEC.md §7 — CRUD users (super_admin + admin)

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "alice@holenek.fr",
    display_name: "Alice",
    app_role: "learner",
    is_active: true,
    mfa_enabled: false,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    learner: {
      id: "l1",
      job_role: "hr",
      team_id: "pole-rh",
    },
    ...overrides,
  };
}

function makePrismaStub() {
  return {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    learner: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    domainEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  } as any;
}

describe("AdminService", () => {
  let service: AdminService;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    service = new AdminService(prisma);
  });

  // ─── listUsers ─────────────────────────────────────────

  it("listUsers returns all users with learner join", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser()]);
    const result = await service.listUsers({});
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("alice@holenek.fr");
    expect(result[0].job_role).toBe("hr");
  });

  it("listUsers filters by app_role", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser({ app_role: "admin" })]);
    await service.listUsers({ role: "admin" });
    const call = prisma.user.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ app_role: "admin" });
  });

  it("listUsers filters active users only", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser()]);
    await service.listUsers({ status: "active" });
    const call = prisma.user.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ is_active: true });
  });

  it("listUsers filters inactive users only", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await service.listUsers({ status: "inactive" });
    const call = prisma.user.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ is_active: false });
  });

  it("listUsers filters by search query on email and display_name", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser()]);
    await service.listUsers({ q: "alice" });
    const call = prisma.user.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: expect.objectContaining({ contains: "alice" }) }),
        expect.objectContaining({ display_name: expect.objectContaining({ contains: "alice" }) }),
      ]),
    );
  });

  // ─── getUserById ───────────────────────────────────────

  it("getUserById returns user with learner", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const result = await service.getUserById("u1");
    expect(result.id).toBe("u1");
  });

  it("getUserById throws NotFoundException for unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getUserById("nope")).rejects.toThrow(NotFoundException);
  });

  // ─── createUser ────────────────────────────────────────

  it("createUser creates user + learner profile in transaction", async () => {
    const created = makeUser();
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.user.findUnique.mockResolvedValue(null); // email not taken
    prisma.user.create.mockResolvedValue(created);
    prisma.learner.create.mockResolvedValue(created.learner);

    const result = await service.createUser({
      email: "alice@holenek.fr",
      display_name: "Alice",
      app_role: "learner",
      password: "Test1234!",
      job_role: "hr",
      team_id: "pole-rh",
    });

    expect(result.email).toBe("alice@holenek.fr");
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it("createUser throws ConflictException if email already taken", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser()); // email exists

    await expect(
      service.createUser({
        email: "alice@holenek.fr",
        display_name: "Alice",
        app_role: "learner",
        password: "Test1234!",
      }),
    ).rejects.toThrow(ConflictException);
  });

  // ─── updateUser ────────────────────────────────────────

  it("updateUser patches display_name and is_active", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    prisma.user.update.mockResolvedValue(makeUser({ display_name: "Alice B.", is_active: false }));

    const result = await service.updateUser("u1", { display_name: "Alice B.", is_active: false });
    expect(result.display_name).toBe("Alice B.");
  });

  it("updateUser throws NotFoundException for unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.updateUser("nope", { display_name: "X" })).rejects.toThrow(NotFoundException);
  });

  // ─── deleteUser ────────────────────────────────────────

  it("deleteUser removes the user", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    prisma.user.delete.mockResolvedValue(makeUser());

    await service.deleteUser("u1");
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("deleteUser throws NotFoundException for unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.deleteUser("nope")).rejects.toThrow(NotFoundException);
  });

  it("deleteUser throws ForbiddenException when deleting the last super_admin", async () => {
    const { ForbiddenException } = await import("@nestjs/common");
    prisma.user.findUnique.mockResolvedValue(makeUser({ app_role: "super_admin" }));
    prisma.user.findMany.mockResolvedValue([makeUser({ app_role: "super_admin" })]);
    await expect(service.deleteUser("u1")).rejects.toThrow(ForbiddenException);
  });

  it("deleteUser throws ForbiddenException on self-deletion", async () => {
    const { ForbiddenException } = await import("@nestjs/common");
    prisma.user.findUnique.mockResolvedValue(makeUser());
    await expect(service.deleteUser("u1", "u1")).rejects.toThrow(ForbiddenException);
  });

  it("updateUser throws ForbiddenException when demoting the last super_admin", async () => {
    const { ForbiddenException } = await import("@nestjs/common");
    prisma.user.findUnique.mockResolvedValue(makeUser({ app_role: "super_admin" }));
    prisma.user.findMany.mockResolvedValue([makeUser({ app_role: "super_admin" })]);
    await expect(service.updateUser("u1", { app_role: "admin" })).rejects.toThrow(ForbiddenException);
  });

  // ─── resetPassword ─────────────────────────────────────

  it("resetPassword hashes the new password and updates the user", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    prisma.user.update.mockResolvedValue(makeUser());

    await service.resetPassword("u1", "NewPass99!");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" } }),
    );
    const updateArg = prisma.user.update.mock.calls[0][0];
    expect(typeof updateArg.data.password_hash).toBe("string");
    expect(updateArg.data.password_hash).not.toBe("NewPass99!");
  });

  it("resetPassword throws NotFoundException for unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.resetPassword("nope", "Pass1234!")).rejects.toThrow(NotFoundException);
  });

  // ─── listLearners ──────────────────────────────────────

  it("listLearners returns LearnerSummary with stamp counts", async () => {
    const stamp1 = { state: "green" };
    const stamp2 = { state: "red" };
    prisma.user.findMany.mockResolvedValue([
      {
        id: "u1",
        email: "alice@holenek.fr",
        display_name: "Alice",
        created_at: new Date("2026-01-01"),
        learner: {
          id: "l1",
          job_role: "hr",
          team_id: "pole-rh",
          stamps: [stamp1, stamp2],
        },
      },
    ]);

    const result = await service.listLearners();

    expect(result).toHaveLength(1);
    expect(result[0].stamp_count).toBe(2);
    expect(result[0].green_count).toBe(1);
    expect(result[0].red_count).toBe(1);
    expect(result[0].orange_count).toBe(0);
    expect(result[0].primary_role).toBe("hr");
  });

  it("listLearners excludes users without learner profile", async () => {
    prisma.user.findMany.mockResolvedValue([
      makeUser({ learner: null }),
    ]);

    const result = await service.listLearners();
    expect(result).toHaveLength(0);
  });

  // ─── getLearnerDetail ──────────────────────────────────

  it("getLearnerDetail returns stamps and progress from domain events", async () => {
    prisma.learner.findUnique.mockResolvedValue({
      id: "l1",
      job_role: "hr",
      team_id: null,
      created_at: new Date("2026-01-01"),
      user: { id: "u1", email: "alice@holenek.fr", display_name: "Alice" },
      stamps: [
        {
          id: "s1",
          state: "green",
          validated_at: new Date("2026-01-01"),
          expires_at: new Date("2027-01-01"),
          performance_score: 85,
          attempts: 1,
          competence: { code: "SEC-001", label_fr: "Sécurité" },
        },
      ],
    });
    prisma.domainEvent.findMany.mockResolvedValue([
      {
        payload: { learner_id: "l1", module_id: "m1", progress_percent: 100 },
        occurred_at: new Date("2026-01-02"),
      },
    ]);

    const result = await service.getLearnerDetail("l1");
    expect(result.stamps).toHaveLength(1);
    expect(result.stamps[0].competence_code).toBe("SEC-001");
    expect(result.progress).toHaveLength(1);
    expect(result.progress[0].progress_percent).toBe(100);
  });

  it("getLearnerDetail throws NotFoundException for unknown learner", async () => {
    prisma.learner.findUnique.mockResolvedValue(null);
    await expect(service.getLearnerDetail("nope")).rejects.toThrow(NotFoundException);
  });
});

