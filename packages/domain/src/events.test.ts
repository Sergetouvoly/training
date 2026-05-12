import { describe, it, expect } from "vitest";
import type {
  DomainEvent,
  ProgressUpdatedPayload,
  CompetenceValidatedPayload,
  ProgressUpdated,
  CompetenceValidated,
  CrisisScenarioCompletedPayload,
  BuddyRoleAcceptedPayload,
  TeamChallengeCompletedPayload,
} from "./events.js";

// Refs: SPEC.md §8 — DomainEvent<T>, immutable, PascalCase past-tense
// Mono-organisation : pas de tenant_id dans les events.

function createEvent<T>(name: string, version: string, payload: T): DomainEvent<T> {
  return {
    event_id: `evt-${Date.now()}`,
    event_name: name,
    event_version: version,
    occurred_at: new Date().toISOString(),
    produced_by: "test",
    payload,
  };
}

describe("DomainEvent<T>", () => {
  it("has all required fields", () => {
    const evt = createEvent("TestEvent", "1.0", { foo: "bar" });
    expect(evt.event_id).toBeTruthy();
    expect(evt.event_name).toBe("TestEvent");
    expect(evt.event_version).toBe("1.0");
    expect(evt.occurred_at).toBeTruthy();
    expect(evt.produced_by).toBe("test");
    expect(evt.payload).toEqual({ foo: "bar" });
  });

  it("correlation_id is optional", () => {
    const evt = createEvent("TestEvent", "1.0", {});
    expect(evt.correlation_id).toBeUndefined();
  });

  it("supports correlation_id when provided", () => {
    const evt: DomainEvent<object> = {
      event_id: "evt-1",
      event_name: "TestEvent",
      event_version: "1.0",
      occurred_at: "2026-01-01T00:00:00Z",
      produced_by: "test",
      correlation_id: "corr-123",
      payload: {},
    };
    expect(evt.correlation_id).toBe("corr-123");
  });
});

describe("ProgressUpdated", () => {
  // Refs: SPEC.md §7 R-1.3
  it("contains learner, module, and progress info", () => {
    const payload: ProgressUpdatedPayload = {
      learner_id: "l-1",
      module_id: "m-1",
      module_version_hash: "sha256-abc",
      progress_percent: 75,
    };
    const evt: ProgressUpdated = createEvent("ProgressUpdated", "1.0", payload);
    expect(evt.event_name).toBe("ProgressUpdated");
    expect(evt.payload.progress_percent).toBe(75);
    expect(evt.payload.module_version_hash).toBeTruthy();
  });

  it("progress_percent is a number", () => {
    const payload: ProgressUpdatedPayload = {
      learner_id: "l-1",
      module_id: "m-1",
      module_version_hash: "sha256-abc",
      progress_percent: 100,
    };
    expect(typeof payload.progress_percent).toBe("number");
  });
});

describe("CompetenceValidated", () => {
  // Refs: SPEC.md §7 R-1.3
  it("contains stamp_id and performance_score", () => {
    const payload: CompetenceValidatedPayload = {
      learner_id: "l-1",
      competence_id: "c-1",
      stamp_id: "s-1",
      performance_score: 88,
      module_version_hash: "sha256-mod1",
    };
    const evt: CompetenceValidated = createEvent("CompetenceValidated", "1.0", payload);
    expect(evt.event_name).toBe("CompetenceValidated");
    expect(evt.payload.stamp_id).toBe("s-1");
    expect(evt.payload.performance_score).toBe(88);
  });

  it("includes module_version_hash for audit traceability (R-1.5)", () => {
    const payload: CompetenceValidatedPayload = {
      learner_id: "l-1",
      competence_id: "c-2",
      stamp_id: "s-2",
      performance_score: 92,
      module_version_hash: "sha256-mod2",
    };
    expect(payload.module_version_hash).toBeTruthy();
  });
});

describe("CrisisScenarioCompleted", () => {
  it("contains learner_id, scenario_id, session_id, score", () => {
    const payload: CrisisScenarioCompletedPayload = {
      learner_id: "l-1",
      scenario_id: "sc-1",
      session_id: "sess-1",
      score: 100,
      path_length: 3,
    };
    const evt = createEvent("CrisisScenarioCompleted", "1.0", payload);
    expect(evt.event_name).toBe("CrisisScenarioCompleted");
    expect(evt.payload.score).toBe(100);
  });
});

describe("BuddyRoleAccepted", () => {
  it("contains learner_id, buddy_id, relation_id", () => {
    const payload: BuddyRoleAcceptedPayload = {
      learner_id: "l-1",
      buddy_id: "l-2",
      relation_id: "rel-1",
    };
    const evt = createEvent("BuddyRoleAccepted", "1.0", payload);
    expect(evt.payload.relation_id).toBe("rel-1");
  });
});

describe("TeamChallengeCompleted", () => {
  it("contains winner_team_id and final_scores", () => {
    const payload: TeamChallengeCompletedPayload = {
      challenge_id: "ch-1",
      winner_team_id: "team-a",
      participating_team_ids: ["team-a", "team-b"],
      final_scores: { "team-a": 85, "team-b": 62 },
    };
    const evt = createEvent("TeamChallengeCompleted", "1.0", payload);
    expect(evt.payload.winner_team_id).toBe("team-a");
    expect(evt.payload.final_scores["team-a"]).toBe(85);
  });
});

describe("Event naming convention", () => {
  // Refs: SPEC.md §8 — PascalCase past-tense
  it("Phase 1/2 events are PascalCase past-tense", () => {
    const events = [
      "ProgressUpdated",
      "CompetenceValidated",
      "CrisisScenarioCompleted",
      "BuddyRoleAccepted",
      "TeamChallengeCompleted",
    ];
    for (const name of events) {
      expect(name).toMatch(/^[A-Z][a-zA-Z]+$/);
      expect(name).toMatch(/ed$/);
    }
  });
});
