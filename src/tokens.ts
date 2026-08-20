/**
 * Mirrors kitchen-pal-api's models/themes.py token vocabulary exactly (19
 * color keys + radius), which in turn matches src/app/globals.css's
 * existing semantic CSS variable names. Both the admin editor and the
 * runtime theme-injection component iterate CORE_THEME_TOKEN_KEYS rather
 * than hand-duplicating this list, so they can never drift out of sync
 * with each other.
 */

export const CORE_THEME_TOKEN_KEYS = [
  "background", "foreground",
  "card", "cardForeground",
  "popover", "popoverForeground",
  "primary", "primaryForeground",
  "secondary", "secondaryForeground",
  "muted", "mutedForeground",
  "accent", "accentForeground",
  "destructive", "destructiveForeground",
  "border", "input", "ring",
] as const;

export type CoreThemeTokenKey = (typeof CORE_THEME_TOKEN_KEYS)[number];

export type ThemeColorTokens = Record<CoreThemeTokenKey, string> & Record<string, string>;

export interface ThemeTokens {
  light: ThemeColorTokens;
  dark: ThemeColorTokens;
  radius: string;
}

export interface ThemeVocabulary {
  /** Core keys followed by this app's extension keys, in emit order. */
  keys: readonly string[];
  extensions: readonly string[];
}

/**
 * An app's token vocabulary: the shared core plus whatever extra semantic
 * tokens that app needs. finance-pal declares positive/negative so its
 * income and expense colors come from the active theme rather than being
 * hardcoded green and red -- which would break under any custom palette.
 * Extensions are per-app so one app adding tokens never forces every other
 * app to define them.
 */
export function defineVocabulary(extensions: readonly string[] = []): ThemeVocabulary {
  const core = new Set<string>(CORE_THEME_TOKEN_KEYS);
  const seen = new Set<string>();
  for (const key of extensions) {
    if (core.has(key)) throw new Error(`"${key}" is already a core token`);
    if (seen.has(key)) throw new Error(`duplicate extension token "${key}"`);
    seen.add(key);
  }
  return { keys: [...CORE_THEME_TOKEN_KEYS, ...extensions], extensions: [...extensions] };
}

/** camelCase token key -> the actual CSS custom property it overrides.
 * Used by both the runtime injector and the admin preview pane so neither
 * has to hand-write the camelCase-to-kebab-case conversion. */
export function cssVarName(key: string): string {
  return `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

/** Token categories for the admin editor, mirroring globals.css's own
 * visual grouping of its semantic tokens. */
export const THEME_TOKEN_CATEGORIES: { label: string; keys: string[] }[] = [
  { label: "Surfaces", keys: ["background", "foreground", "card", "cardForeground", "popover", "popoverForeground"] },
  {
    label: "Brand",
    keys: ["primary", "primaryForeground", "secondary", "secondaryForeground", "accent", "accentForeground"],
  },
  { label: "Semantic", keys: ["muted", "mutedForeground", "destructive", "destructiveForeground"] },
  { label: "Structure", keys: ["border", "input", "ring"] },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const RADIUS_RE = /^\d+(\.\d+)?(px|rem)$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

/** Prepends "#" to a bare 6-digit hex string (e.g. a value pasted straight
 * from a palette site without its leading "#"), so typing/pasting "CFEBFF"
 * produces "#CFEBFF" instead of sitting there as an invalid color. Anything
 * else (already has "#", wrong length, still mid-typing) passes through
 * unchanged. */
export function normalizeHexInput(value: string): string {
  const trimmed = value.trim();
  return /^[0-9a-fA-F]{6}$/.test(trimmed) ? `#${trimmed}` : trimmed;
}

export function isValidRadius(value: string): boolean {
  return RADIUS_RE.test(value);
}

/** Renders a full ThemeTokens object as CSS text overriding :root (light)
 * and .dark (dark), inside an optional selector prefix -- used both for
 * the app-wide runtime override (no prefix) and the admin preview pane
 * (scoped to a container so editing a draft never affects the rest of the
 * page). Every value is validated before being interpolated: this is the
 * actual mechanism behind "malformed payloads never crash rendering" on
 * the frontend side -- an invalid stored value is simply skipped rather
 * than injected as unsafe CSS text. */
export function themeTokensToCss(
  tokens: ThemeTokens,
  vocabulary: ThemeVocabulary,
  scopeSelector?: string,
): string {
  const lightPrefix = scopeSelector ? `${scopeSelector}` : ":root";
  const darkPrefix = scopeSelector ? `${scopeSelector}.dark, ${scopeSelector} .dark` : ".dark";

  const rulesFor = (set: ThemeColorTokens) =>
    vocabulary.keys
      .filter((key) => isValidHexColor(set[key]))
      .map((key) => `  ${cssVarName(key)}: ${set[key]};`)
      .join("\n");

  const radiusRule = isValidRadius(tokens.radius) ? `  --radius: ${tokens.radius};\n` : "";

  return `${lightPrefix} {\n${radiusRule}${rulesFor(tokens.light)}\n}\n${darkPrefix} {\n${rulesFor(tokens.dark)}\n}`;
}
