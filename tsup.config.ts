import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ["react", "react-dom", "next-themes"],
  },
  {
    entry: { "react/index": "src/react/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: false,
    sourcemap: true,
    external: ["react", "react-dom", "next-themes"],
    // Bundling strips per-file "use client" directives, so the client
    // boundary is reapplied to this entry as a whole. The root entry
    // deliberately does not get it: createThemeInitScript is called from a
    // Server Component, and a client-marked module would make that export a
    // client reference that throws on the server.
    banner: { js: '"use client";' },
  },
]);
