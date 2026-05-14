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
    alias: [
      { find: "@elearning/ui", replacement: new URL("../../packages/ui/src/index.ts", import.meta.url).pathname },
      { find: "@elearning/i18n", replacement: new URL("../../packages/i18n/src/index.ts", import.meta.url).pathname },
      { find: "@elearning/api-client", replacement: new URL("../../packages/api-client/src/index.ts", import.meta.url).pathname },
      // prevent next-auth (needs next/server) from loading in jsdom
      { find: "next-auth/react", replacement: new URL("./test/__mocks__/next-auth-react.ts", import.meta.url).pathname },
      { find: "next-auth/providers/credentials", replacement: new URL("./test/__mocks__/credentials.ts", import.meta.url).pathname },
      { find: "next-auth", replacement: new URL("./test/__mocks__/next-auth.ts", import.meta.url).pathname },
      { find: "./auth", replacement: new URL("./test/__mocks__/auth.ts", import.meta.url).pathname },
      { find: "../auth", replacement: new URL("./test/__mocks__/auth.ts", import.meta.url).pathname },
      { find: "../../auth", replacement: new URL("./test/__mocks__/auth.ts", import.meta.url).pathname },
      { find: "../../../auth", replacement: new URL("./test/__mocks__/auth.ts", import.meta.url).pathname },
      { find: "../../../../auth", replacement: new URL("./test/__mocks__/auth.ts", import.meta.url).pathname },
      { find: "../../../../../auth", replacement: new URL("./test/__mocks__/auth.ts", import.meta.url).pathname },
      { find: new URL("./auth.ts", import.meta.url).pathname, replacement: new URL("./test/__mocks__/auth.ts", import.meta.url).pathname },
      { find: "../lib/api", replacement: new URL("./test/__mocks__/lib-api.ts", import.meta.url).pathname },
      { find: "../../lib/api", replacement: new URL("./test/__mocks__/lib-api.ts", import.meta.url).pathname },
      { find: "../../../lib/api", replacement: new URL("./test/__mocks__/lib-api.ts", import.meta.url).pathname },
      { find: "next/navigation", replacement: new URL("./test/__mocks__/next-navigation.ts", import.meta.url).pathname },
    ],
  },
});
