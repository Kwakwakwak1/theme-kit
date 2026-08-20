# @kwakwakwak1/theme-kit

Shared design tokens, palette generator, and theme injector for kwakwakwak apps.

This package holds the *token vocabulary*, the *pre-paint init script*, and
the *React layer* that every consuming app uses to apply a custom,
per-user theme without a flash of the default colors on load. It does not
fetch, store, or authenticate anything itself — each app owns its own data
fetching and passes already-resolved tokens in.

## Installation

The package is published to the GitHub Packages npm registry under the
`@kwakwakwak1` scope, not the public npm registry. Consumers need an
`.npmrc` (repo root, next to `package.json`) that points that scope at
GitHub Packages:

```
@kwakwakwak1:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`NODE_AUTH_TOKEN` must be a GitHub token (classic PAT or `GITHUB_TOKEN` in
CI) with `read:packages` scope, available in the environment at install
time. Locally, export it in your shell profile; in CI, set it as a secret
and pass it through the environment for the `npm ci` / `npm install` step.

Then install as usual:

```bash
npm install @kwakwakwak1/theme-kit
```

`react` and `next-themes` are peer dependencies — install them in the
consuming app if they aren't already there.

## Two entry points: server-safe root, client `/react`

The package is split across two entry points so it works from both
Server and Client Components in a Next.js App Router app:

- **`@kwakwakwak1/theme-kit`** -- the token vocabulary, palette
  generator, presets, and `createThemeInitScript`. None of it carries a
  `"use client"` boundary, so it's safe to import from a Server
  Component -- in particular, `createThemeInitScript` is meant to be
  called directly in a root layout (see below).
- **`@kwakwakwak1/theme-kit/react`** -- `ThemeProvider`, `ThemeSync`,
  `ThemePreviewProvider`, `useThemePreview`, and `ThemePreviewBanner`.
  This entry is built with a `"use client"` boundary over the whole
  bundle, because these are components with hooks and effects that only
  run in the browser.

Importing a React component from the root entry (or vice versa) doesn't
work -- they're intentionally separate builds. Bundling them together
would either strip `"use client"` from the components (breaking them in
apps that enforce the boundary) or mark `createThemeInitScript` as a
client reference, which throws when called from the Server Component
root layout that's supposed to call it.

## Token vocabulary

`CORE_THEME_TOKEN_KEYS` is the single source of truth for the shared
19-key color vocabulary (plus `radius`) that every app's theme is built
from. Don't hand-duplicate this list in an app; import it.

### Extending the vocabulary per app

Apps that need semantic tokens beyond the shared core (for example, a
finance app's `positive`/`negative` colors for income and expense, so
those colors come from the active theme instead of being hardcoded)
declare their own extensions with `defineVocabulary`:

```ts
import { defineVocabulary, FINANCE_TOKEN_EXTENSIONS } from "@kwakwakwak1/theme-kit";

export const vocabulary = defineVocabulary(FINANCE_TOKEN_EXTENSIONS);
// vocabulary.keys === [...CORE_THEME_TOKEN_KEYS, "positive", "positiveForeground", "negative", "negativeForeground"]
```

`defineVocabulary` throws if an extension key collides with a core key or
with another extension key, so a typo can't silently shadow a shared
token. Extensions are per app: one app adding tokens never forces every
other app to define them. Pass the resulting `vocabulary` to
`themeTokensToCss` and to `ThemeSync` (below) wherever tokens are
rendered as CSS.

## Preventing a flash of default theme on load

A user's custom theme is fetched client-side, which means it normally
only becomes available after hydration — too late to avoid a flash back
to the compiled-in default colors on every reload. `createThemeInitScript`
solves this by generating a small, dependency-free script that reads the
last-cached theme straight out of `localStorage` and applies it
synchronously, before the browser paints.

Wire it into a Next.js root layout as a blocking script that runs before
first paint, using `next/script`'s `beforeInteractive` strategy:

```tsx
import Script from "next/script";
import { createThemeInitScript } from "@kwakwakwak1/theme-kit";

const STORAGE_KEY = "fp-theme-tokens"; // pick one per app -- see below

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: createThemeInitScript(STORAGE_KEY) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`createThemeInitScript` throws if `storageKey` isn't lowercase
kebab-case, so a malformed key fails at build/render time rather than
silently reading nothing.

### `storageKey` is per app -- never share it

`storageKey` has no default value in this package on purpose. In local
development, apps commonly share the `localhost` origin (different ports,
same browser), which means they'd also share `localStorage` if they ever
used the same key. Two apps writing and reading the same
`storageKey` is exactly the class of bug this parameter exists to
prevent -- pick a distinct key per app (`fp-theme-tokens`,
`kp-theme-tokens`, ...) and pass it explicitly everywhere the package
asks for one (`createThemeInitScript`, `ThemeSync`).

## React layer

All exports below come from `@kwakwakwak1/theme-kit/react`, not the
package root -- see [Two entry points](#two-entry-points-server-safe-root-client-react) above.

- `ThemeProvider` -- a thin re-export wrapper around `next-themes`'
  `ThemeProvider`, for light/dark mode switching. Mount it in the root
  layout, inside the `<body>`, wrapping `children`:

  ```tsx
  import Script from "next/script";
  import { createThemeInitScript } from "@kwakwakwak1/theme-kit";
  import { ThemeProvider } from "@kwakwakwak1/theme-kit/react";

  const STORAGE_KEY = "fp-theme-tokens"; // pick one per app -- see below

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <Script
            id="theme-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: createThemeInitScript(STORAGE_KEY) }}
          />
        </head>
        <body>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    );
  }
  ```

  Note the split: `createThemeInitScript` runs in the root layout itself
  (a Server Component) and comes from the package root, while
  `ThemeProvider` is a Client Component and comes from `/react` --
  mounting it here doesn't make the layout itself a Client Component,
  since only `ThemeProvider` and its subtree cross that boundary.

- `ThemeSync` -- applies an already-resolved theme by injecting a
  `<style>` tag that overrides the same CSS custom properties a
  consuming app's global stylesheet already defines, so every existing
  component picks it up with no per-component changes. It also caches
  the resolved `tokens` it's given under `storageKey`, which is what the
  init script above reads on the next page load.

  ```tsx
  import { defineVocabulary } from "@kwakwakwak1/theme-kit";
  import { ThemeSync } from "@kwakwakwak1/theme-kit/react";

  const vocabulary = defineVocabulary();

  function AppThemeSync() {
    const tokens = useMyAppsOwnThemeQuery(); // this app's own fetching/auth
    const { preview } = useThemePreview(); // optional, see below
    return (
      <ThemeSync
        tokens={tokens}
        preview={preview?.tokens}
        vocabulary={vocabulary}
        storageKey="fp-theme-tokens"
      />
    );
  }
  ```

  `ThemeSync` takes already-resolved `tokens` as a prop rather than
  fetching them itself -- it cannot depend on next-auth, TanStack Query,
  or any app's API client, since every app authenticates and fetches
  differently. When `tokens` is `null` (loading, logged out, or a failed
  fetch) it deliberately leaves whatever style is already applied in
  place -- the init script's cached theme, or the compiled-in defaults --
  rather than clearing it and flashing back to default on a transient
  refetch.

  `tokens` and `preview` are deliberately separate props, and the
  package -- not the consuming app -- owns how they combine: the
  rendered theme is `preview ?? tokens`, but only `tokens` is ever
  cached. An in-progress, unpublished preview is shown on screen but
  never written to `storageKey`, so it can never leak into the next
  page load -- the init script's cache always reflects the theme the
  user is actually supposed to see, not whatever was being previewed
  when the tab last closed. Just pass `tokens` and omit `preview`
  entirely if an app has no preview mechanism.

- `ThemePreviewProvider` / `useThemePreview` / `ThemePreviewBanner` --
  an optional mechanism for a theme editor UI to preview an in-progress,
  unpublished theme edit site-wide before it's saved. `ThemePreviewProvider`
  holds the preview purely in client-side React state (never persisted,
  never sent to the server), so it can't leak to another user or tab and
  resets the moment the page reloads. `ThemePreviewBanner` renders a
  small "Previewing an unpublished theme" indicator with an exit action
  whenever a preview is active. Pass `useThemePreview().preview?.tokens`
  straight into `ThemeSync`'s `preview` prop (see above); `ThemeSync`
  takes care of rendering it while keeping the cache tied to the real
  resolved theme.

## Publishing

Tagging a commit `vX.Y.Z` and pushing the tag triggers
`.github/workflows/publish.yml`, which type-checks, tests, builds, and
publishes to GitHub Packages.
