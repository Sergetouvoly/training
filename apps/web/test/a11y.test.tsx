// Refs: SPEC.md §8 — WCAG AA = CI gate (axe-core)
// Tests it_passes_axe_aa sur les 5 routes BLOC 7
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { expect, describe, it } from "vitest";

expect.extend(toHaveNoViolations);

// Import des pages (Server Components sans async pour le test)
import DashboardPage from "../app/(app)/dashboard/page";
import ParcoursPage from "../app/(app)/parcours/page";
import ModulePage from "../app/(app)/module/page";
import EvalPage from "../app/(app)/eval/page";
import ProfilPage from "../app/(app)/profil/page";

const pages = [
  { name: "dashboard", Component: DashboardPage },
  { name: "parcours", Component: ParcoursPage },
  { name: "module", Component: ModulePage },
  { name: "eval", Component: EvalPage },
  { name: "profil", Component: ProfilPage },
];

describe("it_passes_axe_aa — 5 routes BLOC 7", () => {
  for (const { name, Component } of pages) {
    it(`route /${name} passe axe-core WCAG AA`, async () => {
      const { container } = render(<Component />);
      const results = await axe(container, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
      expect(results).toHaveNoViolations();
    });
  }
});
