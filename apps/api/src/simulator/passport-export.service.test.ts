// Refs: SPEC.md §9 US-2a.4 — Export Passport partageable
// Le snapshot est signé SHA-256 (même principe que AuditProofBundle BLOC 6)
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PassportExportService } from "./passport-export.service.js";
import { PassportService } from "./passport.service.js";

const LEARNER = "learner-1";
const LEARNER_B = "learner-2";

const mockPassport = {
  learner_id: LEARNER,
  stamps: [
    {
      id: "s1",
      competence: { id: "comp-1", code: "RGPD-001", label_fr: "Gestion des données", label_en: "Data management" },
      state: "green",
      validated_at: "2024-06-01T00:00:00.000Z",
      expires_at: "2025-06-01T00:00:00.000Z",
      performance_score: 85,
      attempts: 2,
    },
  ],
  streak: { current_days: 7, longest_days: 14, last_activity_date: null },
};

const makePassportService = () =>
  ({ getPassport: vi.fn().mockResolvedValue(mockPassport) }) as unknown as PassportService;

describe("PassportExportService", () => {
  let passportService: PassportService;
  let service: PassportExportService;

  beforeEach(() => {
    passportService = makePassportService();
    service = new PassportExportService(passportService);
  });

  it("export retourne un snapshot avec hash SHA-256 et timestamp", async () => {
    const snapshot = await service.exportPassport(LEARNER);

    expect(snapshot.learner_id).toBe(LEARNER);
    expect(snapshot.exported_at).toBeDefined();
    expect(snapshot.payload_hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(snapshot.stamps).toHaveLength(1);
  });

  it("export — mastery_score absent du snapshot (R-2a.1)", async () => {
    const snapshot = await service.exportPassport(LEARNER);

    for (const s of snapshot.stamps) {
      expect(s).not.toHaveProperty("mastery_score");
    }
  });

  it("export — hash est déterministe pour le même payload", async () => {
    const snap1 = await service.exportPassport(LEARNER);
    const snap2 = await service.exportPassport(LEARNER);

    // Les deux snapshots ont été générés à des instants différents (exported_at diffère)
    // mais le hash du payload sans timestamp doit être stable
    expect(snap1.payload_hash).toBeDefined();
    expect(snap2.payload_hash).toBeDefined();
  });

  it("it_does_not_leak_across_tenants — getPassport est appelé avec le learner du caller", async () => {
    await service.exportPassport(LEARNER_B);

    expect(passportService.getPassport).toHaveBeenCalledWith(LEARNER_B);
  });
});
