import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@elearning/ui": new URL("../../packages/ui/src/index.ts", import.meta.url).pathname,
      "@elearning/i18n": new URL("../../packages/i18n/src/index.ts", import.meta.url).pathname,
      "@elearning/api-client": new URL("../../packages/api-client/src/index.ts", import.meta.url).pathname,
      // prevent next-auth (needs next/server) from loading in jsdom
      "next-auth": new URL("./test/__mocks__/next-auth.ts", import.meta.url).pathname,
      "./auth": new URL("./test/__mocks__/auth.ts", import.meta.url).pathname,
      "../auth": new URL("./test/__mocks__/auth.ts", import.meta.url).pathname,
      "../../auth": new URL("./test/__mocks__/auth.ts", import.meta.url).pathname,
      "../lib/api": new URL("./test/__mocks__/lib-api.ts", import.meta.url).pathname,
      "../../lib/api": new URL("./test/__mocks__/lib-api.ts", import.meta.url).pathname,
      "../../../lib/api": new URL("./test/__mocks__/lib-api.ts", import.meta.url).pathname,
      "next/navigation": new URL("./test/__mocks__/next-navigation.ts", import.meta.url).pathname,
    },
  },
});
