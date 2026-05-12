import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ProgressionService } from "./progression.service.js";

// Refs: SPEC.md §9 R-1.3, §11 US-1.2

function makePrismaStub() {
  const events: any[] = [];
  return {
    module: {
      findFirst: vi.fn(),
    },
    domainEvent: {
      create: vi.fn().mockImplementation(async (args: any) => {
        const e = { ...args.data, occurred_at: new Date() };
        events.push(e);
        return e;
      }),
      findMany: vi.fn(),
    },
    _events: events,
  } as any;
}

describe("ProgressionService", () => {
  let service: ProgressionService;
  let prisma: ReturnType<typeof makePrismaStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    service = new ProgressionService(prisma);
  });

  it("saves progress and emits ProgressUpdated event (R-1.3, US-1.2)", async () => {
    prisma.module.findFirst.mockResolvedValue({ id: "m1" });

    const record = await service.saveProgress("u1", {
      learner_id: "l1",
      module_id: "m1",
      module_version_hash: "hash1",
      progress_percent: 50,
    });

    expect(record.learner_id).toBe("l1");
    expect(record.progress_percent).toBe(50);

    expect(prisma.domainEvent.create).toHaveBeenCalledTimes(1);
    const eventCall = prisma.domainEvent.create.mock.calls[0][0];
    expect(eventCall.data.event_name).toBe("ProgressUpdated");
    expect(eventCall.data.event_version).toBe("1");
    expect(eventCall.data.payload).toEqual({
      learner_id: "l1",
      module_id: "m1",
      module_version_hash: "hash1",
      progress_percent: 50,
    });
  });

  it("throws NotFoundException if module does not exist", async () => {
    prisma.module.findFirst.mockResolvedValue(null);

    await expect(
      service.saveProgress("u1", {
        learner_id: "l1",
        module_id: "unknown",
        module_version_hash: "h",
        progress_percent: 10,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("generates a unique record id per save", async () => {
    prisma.module.findFirst.mockResolvedValue({ id: "m1" });

    const r1 = await service.saveProgress("u1", {
      learner_id: "l1", module_id: "m1", module_version_hash: "h", progress_percent: 10,
    });
    const r2 = await service.saveProgress("u1", {
      learner_id: "l1", module_id: "m1", module_version_hash: "h", progress_percent: 20,
    });

    expect(r1.id).not.toBe(r2.id);
  });

  it("each save emits a separate ProgressUpdated event", async () => {
    prisma.module.findFirst.mockResolvedValue({ id: "m1" });

    await service.saveProgress("u1", {
      learner_id: "l1", module_id: "m1", module_version_hash: "h", progress_percent: 10,
    });
    await service.saveProgress("u1", {
      learner_id: "l1", module_id: "m1", module_version_hash: "h", progress_percent: 50,
    });

    expect(prisma.domainEvent.create).toHaveBeenCalledTimes(2);
    expect(prisma._events[0].payload.progress_percent).toBe(10);
    expect(prisma._events[1].payload.progress_percent).toBe(50);
  });
});
