"use client";

import { useEffect } from "react";
import { themeTokensToCss, type ThemeTokens, type ThemeVocabulary } from "../tokens";

const STYLE_ELEMENT_ID = "custom-theme-override";

export interface ThemeSyncProps {
  /** The user's resolved theme for this app, or null while loading, logged
   * out, or after a failed fetch. This is the only value ever cached. */
  tokens: ThemeTokens | null;
  /** An in-progress, unpublished theme being previewed. Rendered when
   * present, never cached -- the cache is what the pre-paint init script
   * applies on the next load, so it must hold the theme the user is
   * actually supposed to see. */
  preview?: ThemeTokens | null;
  vocabulary: ThemeVocabulary;
  /** Per app: "fp-theme-tokens", "kp-theme-tokens", ... */
  storageKey: string;
}

/**
 * Applies the resolved theme (or, when present, an in-progress preview) by
 * injecting a <style> tag overriding the same CSS custom properties a
 * consuming app's own global stylesheet already defines, so every
 * component picks it up with no component-level changes anywhere.
 *
 * Caching and rendering are deliberately split: `preview` is rendered but
 * never cached, while `tokens` is the only value ever written to
 * `storageKey`. The cache is what the pre-paint init script applies on the
 * next page load, so it must always hold the theme the user is actually
 * supposed to see -- not whatever an admin happened to be previewing when
 * the tab last closed.
 *
 * Does not block first paint: the blocking init script in the root layout
 * has already applied whatever this app cached on the user's last visit, so
 * there is normally nothing left to flash to by the time this effect runs.
 * On a first-ever visit or a fetch failure nothing is injected and the
 * compiled-in defaults apply untouched.
 */
export function ThemeSync({ tokens, preview, vocabulary, storageKey }: ThemeSyncProps) {
  useEffect(() => {
    if (!tokens) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tokens));
    } catch {
      // Private browsing, storage disabled, or quota exceeded. The override
      // below still applies; this cache only prevents a flash next load.
    }
  }, [tokens, storageKey]);

  const rendered = preview ?? tokens;

  useEffect(() => {
    if (!rendered) {
      // Loading, logged out, or the fetch failed. Leave whatever is applied
      // (the init script's cached theme, or the compiled-in defaults) rather
      // than clearing it and flashing back to default on a transient refetch.
      return;
    }
    let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ELEMENT_ID;
      document.head.appendChild(styleEl);
    }
    try {
      styleEl.textContent = themeTokensToCss(rendered, vocabulary);
    } catch {
      // Never let malformed tokens crash rendering.
    }
  }, [rendered, vocabulary]);

  return null;
}
