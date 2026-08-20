"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ThemeTokens } from "../tokens";

export interface ThemePreview {
  tokens: ThemeTokens;
}

interface ThemePreviewContextValue {
  preview: ThemePreview | null;
  setPreview: (preview: ThemePreview | null) => void;
}

const ThemePreviewContext = createContext<ThemePreviewContextValue | null>(null);

/**
 * Holds an in-progress, unpublished theme edit so it can be applied
 * site-wide while someone browses around a consuming app -- without
 * saving, publishing, setting it primary, or refreshing. Deliberately pure
 * client-side React state (never written to sessionStorage/localStorage,
 * never sent to the server): it must be impossible for this to leak to
 * another user, another tab, or survive a reload -- a plain in-memory
 * value that resets to nothing the moment the tab is closed or reloaded is
 * the simplest way to guarantee that.
 *
 * Lives at the root layout (a sibling to wherever the app applies its
 * resolved theme) so it survives client-side navigation away from a theme
 * editor UI -- the whole point is to let someone click around the real app
 * and see it themed, not just a small preview pane inside the editor
 * itself. A consuming app decides how to prefer this preview over its
 * fetched resolved theme when rendering; note that only the real resolved
 * theme should ever be cached for the pre-paint init script (see
 * ThemeSync) -- caching a transient, unpublished preview would mean the
 * next page load flashes to an edit that was never actually saved.
 */
export function ThemePreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreviewState] = useState<ThemePreview | null>(null);
  const setPreview = useCallback((next: ThemePreview | null) => setPreviewState(next), []);
  const value = useMemo(() => ({ preview, setPreview }), [preview, setPreview]);
  return <ThemePreviewContext.Provider value={value}>{children}</ThemePreviewContext.Provider>;
}

export function useThemePreview(): ThemePreviewContextValue {
  const ctx = useContext(ThemePreviewContext);
  if (!ctx) throw new Error("useThemePreview must be used within a ThemePreviewProvider");
  return ctx;
}

/**
 * Always visible while a site-wide theme preview is active (see
 * ThemePreviewProvider above) -- makes it unmistakable that the colors
 * currently on screen are a temporary, unpublished preview, not the real
 * applied theme, no matter which page has been navigated to. Fixed to a
 * corner rather than a top banner so it stays clear of a consuming app's
 * own header or navigation chrome.
 */
export function ThemePreviewBanner() {
  const { preview, setPreview } = useThemePreview();
  if (!preview) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 60, display: "flex", alignItems: "center", gap: 12,
        padding: "8px 16px", borderRadius: 9999,
        background: "var(--card)", color: "var(--card-foreground)",
        border: "1px solid var(--border)",
      }}
    >
      <span>Previewing an unpublished theme</span>
      <button type="button" onClick={() => setPreview(null)}>
        Exit preview
      </button>
    </div>
  );
}
