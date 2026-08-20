"use client";

import { useEffect } from "react";
import { themeTokensToCss, type ThemeTokens, type ThemeVocabulary } from "../tokens";

const STYLE_ELEMENT_ID = "custom-theme-override";

export interface ThemeSyncProps {
  /** The resolved theme for this user in this app, or null while loading,
   * logged out, or after a failed fetch. Each app owns its own fetching --
   * this package must not depend on any app's auth or query client. */
  tokens: ThemeTokens | null;
  vocabulary: ThemeVocabulary;
  /** Per app: "fp-theme-tokens", "kp-theme-tokens", ... */
  storageKey: string;
}

/**
 * Applies the resolved theme by injecting a <style> tag overriding the same
 * CSS custom properties a consuming app's own global stylesheet already
 * defines, so every component picks it up with no component-level changes
 * anywhere.
 *
 * Does not block first paint: the blocking init script in the root layout
 * has already applied whatever this app cached on the user's last visit, so
 * there is normally nothing left to flash to by the time this effect runs.
 * On a first-ever visit or a fetch failure nothing is injected and the
 * compiled-in defaults apply untouched.
 */
export function ThemeSync({ tokens, vocabulary, storageKey }: ThemeSyncProps) {
  useEffect(() => {
    if (!tokens) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tokens));
    } catch {
      // Private browsing, storage disabled, or quota exceeded. The override
      // below still applies; this cache only prevents a flash next load.
    }
  }, [tokens, storageKey]);

  useEffect(() => {
    if (!tokens) {
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
      styleEl.textContent = themeTokensToCss(tokens, vocabulary);
    } catch {
      // Never let malformed tokens crash rendering.
    }
  }, [tokens, vocabulary]);

  return null;
}
