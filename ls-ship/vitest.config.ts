import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // The "server-only" guard package throws when imported outside a
      // react-server context; unit tests run in plain Node, so stub it.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
