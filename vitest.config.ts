import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    poolOptions: {
      threads: {
        execArgv: ["--no-experimental-webstorage"],
      },
      forks: {
        execArgv: ["--no-experimental-webstorage"],
      },
    },
  },
});
