import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EvaluationService } from "./evaluation.service.js";

// Refs: SPEC.md §9 US-1.3, R-1.3, R-1.1

function makePrismaStub() {
  const stamps: any[] = [];
  const events: any[] = [];
  return {
    competence: { findFirst: vi.fn() },
    module: { findFirst: vi.fn() },
    appConfig: { findUnique: vi.fn() },
    stamp: {
      create: vi.fn().mockImplementation(async (args: any) => {
        const s = { id: `stamp-${stamps.length + 1}`, ...args.data };
        stamps.push(s);
        return s;
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    domainEvent: {
      create: vi.fn().mockImplementation(async (args: any) => {
        events.push(args.data);
        return args.data;
      }),
    },
    _stamps: stamps,
    _events: events,
  } as any;
}

function makeItemServiceStub() {
  return { findById: vi.fn() } as any;
}

const qcmItem = {
  id: "i1",
  format: "qcm_single",
  content: {
    question_fr: "Q1?",
    choices: [
      { label: "A", is_correct: true },
      { label: "B", is_correct: false },
    ],
  },
};

const tfItem = {
  id: "i2",
  format: "true_false",
  content: { question_fr: "Q2?", correct_answer: "true" },
};

const multiItem = {
  id: "i3",
  format: "qcm_multi",
  content: {
    question_fr: "Q3?",
    choices: [
      { label: "A", is_correct: true },
      { label: "B", is_correct: true },
      { label: "C", is_correct: false },
    ],
  },
};

const baseDto = {
  learner_id: "l1",
  competence_id: "c1",
  bank_id: "b1",
  module_id: "m1",
  module_version_hash: "h1",
};

describe("EvaluationService", () => {
  let service: EvaluationService;
  let prisma: ReturnType<typeof makePrismaStub>;
  let itemService: ReturnType<typeof makeItemServiceStub>;

  beforeEach(() => {
    prisma = makePrismaStub();
    itemService = makeItemServiceStub();
    service = new EvaluationService(prisma, itemService);

    prisma.competence.findFirst.mockResolvedValue({ id: "c1" });
    prisma.module.findFirst.mockResolvedValue({ id: "m1" });
    prisma.appConfig.findUnique.mockResolvedValue({ key: "stamp_validity_months", value: 12 });
  });

  it("scores qcm_single correctly — 100% (US-1.3)", async () => {
    itemService.findById.mockResolvedValue(qcmItem);

    const result = await service.submit({ ...baseDto, answers: [{ item_id: "i1", answer: "A" }] });

    expect(result.performance_score).toBe(100);
    expect(result.correct_items).toBe(1);
    expect(result.total_items).toBe(1);
    expect(result.state).toBe("green");
  });

  it("scores qcm_single wrong answer — 0%", async () => {
    itemService.findById.mockResolvedValue(qcmItem);

    const result = await service.submit({ ...baseDto, answers: [{ item_id: "i1", answer: "B" }] });

    expect(result.performance_score).toBe(0);
    expect(result.correct_items).toBe(0);
  });

  it("scores true_false correctly", async () => {
    itemService.findById.mockResolvedValue(tfItem);

    const result = await service.submit({ ...baseDto, answers: [{ item_id: "i2", answer: "true" }] });

    expect(result.performance_score).toBe(100);
  });

  it("scores qcm_multi — all correct labels needed", async () => {
    itemService.findById.mockResolvedValue(multiItem);

    const result = await service.submit({ ...baseDto, answers: [{ item_id: "i3", answer: ["A", "B"] }] });

    expect(result.performance_score).toBe(100);
  });

  it("scores qcm_multi — partial answer = wrong", async () => {
    itemService.findById.mockResolvedValue(multiItem);

    const result = await service.submit({ ...baseDto, answers: [{ item_id: "i3", answer: ["A"] }] });

    expect(result.performance_score).toBe(0);
  });

  it("scores mixed items — 2/3 correct = 67%", async () => {
    itemService.findById
      .mockResolvedValueOnce(qcmItem)
      .mockResolvedValueOnce(tfItem)
      .mockResolvedValueOnce(multiItem);

    const result = await service.submit({
      ...baseDto,
      answers: [
        { item_id: "i1", answer: "A" },
        { item_id: "i2", answer: "true" },
        { item_id: "i3", answer: ["A"] },
      ],
    });

    expect(result.performance_score).toBe(67);
    expect(result.correct_items).toBe(2);
    expect(result.total_items).toBe(3);
  });

  it("creates a Stamp with state green and correct expiration (R-1.1)", async () => {
    itemService.findById.mockResolvedValue(qcmItem);

    await service.submit({ ...baseDto, answers: [{ item_id: "i1", answer: "A" }] });

    expect(prisma.stamp.create).toHaveBeenCalledTimes(1);
    const stampData = prisma.stamp.create.mock.calls[0][0].data;
    expect(stampData.state).toBe("green");
    expect(stampData.learner_id).toBe("l1");
    expect(stampData.competence_id).toBe("c1");
    expect(stampData.performance_score).toBe(100);
    expect(stampData.mastery_score).toBeNull();
    expect(stampData.attempts).toBe(1);

    const validated = new Date(stampData.validated_at);
    const expires = new Date(stampData.expires_at);
    const diffMonths =
      (expires.getFullYear() - validated.getFullYear()) * 12 +
      (expires.getMonth() - validated.getMonth());
    expect(diffMonths).toBe(12);
  });

  it("emits CompetenceValidated event (R-1.3)", async () => {
    itemService.findById.mockResolvedValue(qcmItem);

    const result = await service.submit({ ...baseDto, answers: [{ item_id: "i1", answer: "A" }] });

    expect(prisma.domainEvent.create).toHaveBeenCalledTimes(1);
    const event = prisma._events[0];
    expect(event.event_name).toBe("CompetenceValidated");
    expect(event.event_version).toBe("1");
    expect(event.payload.learner_id).toBe("l1");
    expect(event.payload.competence_id).toBe("c1");
    expect(event.payload.stamp_id).toBe(result.stamp_id);
    expect(event.payload.performance_score).toBe(100);
  });

  it("increments attempts on repeated evaluations", async () => {
    prisma.stamp.count.mockResolvedValue(2);
    itemService.findById.mockResolvedValue(qcmItem);

    await service.submit({ ...baseDto, answers: [{ item_id: "i1", answer: "A" }] });

    const stampData = prisma.stamp.create.mock.calls[0][0].data;
    expect(stampData.attempts).toBe(3);
  });

  it("rejects empty answers", async () => {
    await expect(service.submit({ ...baseDto, answers: [] })).rejects.toThrow(BadRequestException);
  });

  it("throws NotFoundException if competence not found", async () => {
    prisma.competence.findFirst.mockResolvedValue(null);

    await expect(
      service.submit({ ...baseDto, competence_id: "unknown", answers: [{ item_id: "i1", answer: "A" }] }),
    ).rejects.toThrow(NotFoundException);
  });

  it("uses AppConfig stamp_validity_months for expiration", async () => {
    prisma.appConfig.findUnique.mockResolvedValue({ key: "stamp_validity_months", value: 6 });
    itemService.findById.mockResolvedValue(qcmItem);

    await service.submit({ ...baseDto, answers: [{ item_id: "i1", answer: "A" }] });

    const stampData = prisma.stamp.create.mock.calls[0][0].data;
    const validated = new Date(stampData.validated_at);
    const expires = new Date(stampData.expires_at);
    const diffMonths =
      (expires.getFullYear() - validated.getFullYear()) * 12 +
      (expires.getMonth() - validated.getMonth());
    expect(diffMonths).toBe(6);
  });

  it("defaults to 12 months when AppConfig key is absent", async () => {
    prisma.appConfig.findUnique.mockResolvedValue(null);
    itemService.findById.mockResolvedValue(qcmItem);

    await service.submit({ ...baseDto, answers: [{ item_id: "i1", answer: "A" }] });

    const stampData = prisma.stamp.create.mock.calls[0][0].data;
    const validated = new Date(stampData.validated_at);
    const expires = new Date(stampData.expires_at);
    const diffMonths =
      (expires.getFullYear() - validated.getFullYear()) * 12 +
      (expires.getMonth() - validated.getMonth());
    expect(diffMonths).toBe(12);
  });
});
