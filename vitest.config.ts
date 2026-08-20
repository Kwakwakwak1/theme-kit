import { defineConfig } from "vitest/config";

// Node 22 added a native localStorage global that stays undefined unless
// --localstorage-file is passed, and it pre-empts jsdom's own shim -- so
// under jsdom on Node 22+, tests see no localStorage at all. Disabling the
// native implementation hands the global back to jsdom.
//
// The flag does not exist before Node 22, and Node refuses to start when
// given an unknown flag, so it is only passed where it is understood. CI
// runs Node 20 and needs no flag; local development on a newer Node does.
const nodeMajor = Number(process.versions.node.split(".")[0]);
const execArgv = nodeMajor >= 22 ? ["--no-experimental-webstorage"] : [];

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    poolOptions: {
      threads: { execArgv },
      forks: { execArgv },
    },
  },
});
