import { defineConfig, devices } from "@playwright/test";

// Refs: SPEC.md §9 C-1.5 — E2E complet Phase 1
// WORKFLOW.md §3 — E2E 10% Playwright
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env["BASE_URL"] ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Ne démarre pas le serveur automatiquement en CI — géré par docker-compose
  webServer: process.env["CI"]
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
