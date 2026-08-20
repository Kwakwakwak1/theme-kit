/**
 * Derives a full 19-token light+dark theme from just 4 input colors (the
 * "popular palette" style popularized by sites like Color Hunt -- 4
 * unordered swatches, no assigned roles). Roles are auto-detected from each
 * color's lightness/saturation, then every other token (surfaces, semantic
 * colors, structure) is generated algorithmically in HSL space, always
 * re-validated for WCAG contrast rather than trusting the raw input hues.
 *
 * `seed` makes generation deterministic and "mix it up" possible: the same
 * 4 colors + same seed always produce the same theme, but a different seed
 * re-derives from those same 4 colors using a different (still
 * contrast-safe) styling choice -- which knob gets primary vs. accent, how
 * far surfaces/borders are offset, whether the ring follows primary or
 * accent, and small hue jitter on the non-brand tokens.
 */

import { CORE_THEME_TOKEN_KEYS, type ThemeColorTokens, type ThemeTokens } from "./tokens";

interface RGB {
  r: number;
  g: number;
  b: number;
}
interface HSL {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

function hexToRgb(hex: string): RGB {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}
function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb({ ...hsl, s: Math.min(1, Math.max(0, hsl.s)), l: Math.min(1, Math.max(0, hsl.l)) }));
}

function relativeLuminance({ r, g, b }: RGB): number {
  const srgb = [r, g, b].map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** WCAG contrast ratio between two hex colors, 1 (identical) to 21 (black/white). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Nudges lightness (keeping hue/saturation) toward an extreme until the
 * result clears `minRatio` against `against`, or gives up after a bounded
 * number of steps (always returns a valid color either way). */
function pushForContrast(hsl: HSL, against: string, wantDark: boolean, minRatio: number): HSL {
  let out = { ...hsl };
  let tries = 0;
  while (contrastRatio(hslToHex(out), against) < minRatio && tries < 20) {
    out = { ...out, l: wantDark ? Math.max(0, out.l - 0.03) : Math.min(1, out.l + 0.03) };
    tries++;
  }
  return out;
}

/** A near-black or near-white tone (tinted with `hue`) -- whichever clears
 * better contrast against `against` -- pushed further if needed. The
 * starting point is drawn from `rng` (not a fixed constant): a fixed
 * starting point almost always already clears typical thresholds on the
 * first try, so the result would come out identical for every seed --
 * exactly the "mix it up doesn't change foreground/card-foreground/
 * popover-foreground/accent-foreground" bug this fixes. */
function contrastForeground(rng: () => number, hue: number, against: string, minRatio = 4.5): string {
  const dark = pushForContrast({ h: hue, s: 0.06 + rng() * 0.14, l: 0.04 + rng() * 0.14 }, against, true, minRatio);
  const light = pushForContrast({ h: hue, s: 0.04 + rng() * 0.1, l: 0.88 + rng() * 0.1 }, against, false, minRatio);
  return contrastRatio(hslToHex(dark), against) >= contrastRatio(hslToHex(light), against)
    ? hslToHex(dark)
    : hslToHex(light);
}

// --- seeded PRNG (mulberry32) so a given seed always reproduces the same theme ---
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function classify(colors: [string, string, string, string]) {
  const withHsl = colors.map((hex) => ({ hex, hsl: hexToHsl(hex) }));
  const byLightness = [...withHsl].sort((a, b) => a.hsl.l - b.hsl.l);
  const bySaturation = [...withHsl].sort((a, b) => b.hsl.s - a.hsl.s);

  const darkest = byLightness[0];
  const lightest = byLightness[3];
  const primarySource = bySaturation[0];

  // Accent: the most-saturated remaining color whose hue is furthest from
  // primary's -- keeps the two brand colors visually distinct even when the
  // palette has two similarly-vivid swatches.
  const remaining = bySaturation.slice(1);
  const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const accentSource = [...remaining].sort(
    (a, b) => hueDistance(b.hsl.h, primarySource.hsl.h) - hueDistance(a.hsl.h, primarySource.hsl.h)
  )[0];
  const secondarySource = remaining.find((c) => c !== accentSource) ?? remaining[0];
  const neutralSource = bySaturation[3];

  return { darkest, lightest, primarySource, accentSource, secondarySource, neutralSource };
}

interface GenerateOptions {
  /** Deterministic variation knob -- same colors + same seed = same theme. */
  seed?: number;
}

/** Builds a complete ThemeTokens (light + dark, 19 keys each) from 4
 * unordered input colors. Role assignment (which color reads as
 * background/primary/accent/etc.) is auto-detected by lightness and
 * saturation, matching how a raw 4-swatch "popular palette" has no
 * pre-assigned roles. `seed` lets the caller re-derive a different, still
 * contrast-safe, styling from the same 4 colors ("mix it up"). */
export function generateThemeFromPalette(colors: [string, string, string, string], options: GenerateOptions = {}): ThemeTokens {
  const rng = mulberry32(options.seed ?? 0);
  const { darkest, lightest, primarySource, accentSource, secondarySource, neutralSource } = classify(colors);

  // Knobs randomized per-seed, each within a bounded/safe range so every
  // result stays coherent regardless of what "mix it up" rolls.
  const swapAccentSecondary = rng() < 0.3;
  const accentHue = swapAccentSecondary ? secondarySource.hsl.h : accentSource.hsl.h;
  const secondaryHue = swapAccentSecondary ? accentSource.hsl.h : secondarySource.hsl.h;
  const hueJitter = (rng() - 0.5) * 12; // +-6deg, applied to non-brand tokens only
  const popoverMatchesCard = rng() < 0.6;
  const ringFollowsAccent = rng() < 0.25;
  const surfaceOffset = 0.02 + rng() * 0.035; // how distinct card/muted/border read from background

  function buildVariant(mode: "light" | "dark"): ThemeColorTokens {
    const isLight = mode === "light";
    const bgHue = isLight ? lightest.hsl.h : darkest.hsl.h;
    const fgHue = isLight ? darkest.hsl.h : lightest.hsl.h;

    // Saturation intensity and lightness both carry a seed-driven jitter --
    // otherwise background/foreground would be a pure function of the 4
    // input colors' hues alone, and never change between "mix it up" rolls.
    const bgSatFactor = 0.2 + rng() * 0.35;
    const bgLightJitter = (rng() - 0.5) * (isLight ? 0.03 : 0.08);
    const background = hslToHex({
      h: bgHue,
      s: clamp((isLight ? lightest.hsl.s : darkest.hsl.s) * bgSatFactor, 0, 0.22),
      l: clamp((isLight ? 0.975 : 0.11) + bgLightJitter, isLight ? 0.94 : 0.06, isLight ? 0.99 : 0.16),
    });
    const foreground = contrastForeground(rng, fgHue, background, 7);

    const card = hslToHex({
      h: bgHue,
      s: clamp((isLight ? lightest.hsl.s : darkest.hsl.s) * 0.35, 0, 0.16),
      l: clamp(isLight ? 0.975 - surfaceOffset * 0.4 : 0.11 + surfaceOffset * 0.6, 0, 1),
    });
    const cardForeground = foreground;
    const popover = popoverMatchesCard ? card : background;
    const popoverForeground = foreground;

    const primary = hslToHex({
      h: primarySource.hsl.h + (rng() - 0.5) * 6,
      s: clamp(0.55 + primarySource.hsl.s * 0.25, 0.45, 0.85),
      l: isLight ? clamp(0.38 + rng() * 0.08, 0.3, 0.5) : clamp(0.55 + rng() * 0.1, 0.5, 0.7),
    });
    const primaryForeground = contrastForeground(rng, bgHue, primary, 4.5);

    const secondary = hslToHex({
      h: secondaryHue + hueJitter,
      s: clamp(0.25 + secondarySource.hsl.s * 0.2, 0.12, 0.45),
      l: isLight ? clamp(0.88 - surfaceOffset, 0.75, 0.94) : clamp(0.22 + surfaceOffset, 0.16, 0.32),
    });
    const secondaryForeground = contrastForeground(rng, fgHue, secondary, 4.5);

    const accent = hslToHex({
      h: accentHue + hueJitter,
      s: clamp(0.45 + accentSource.hsl.s * 0.3, 0.3, 0.85),
      l: isLight ? clamp(0.82 - surfaceOffset, 0.68, 0.9) : clamp(0.3 + surfaceOffset, 0.22, 0.42),
    });
    const accentForeground = contrastForeground(rng, fgHue, accent, 4.5);

    const muted = hslToHex({
      h: (neutralSource.hsl.h + bgHue) / 2 + hueJitter,
      s: clamp(neutralSource.hsl.s * 0.25, 0, 0.14),
      l: isLight ? clamp(0.94 - surfaceOffset, 0.85, 0.96) : clamp(0.17 + surfaceOffset, 0.14, 0.26),
    });
    const mutedForeground = hslToHex({
      h: fgHue,
      s: 0.08,
      l: isLight ? 0.42 : 0.68,
    });

    // Destructive stays a recognizable red so it reads as "danger"
    // regardless of the input palette, but its saturation/lightness is
    // tuned to the theme's own vividness/mode so it doesn't clash.
    const destructive = hslToHex({ h: clamp(357 + hueJitter * 0.3, 350, 364) % 360, s: 0.72, l: isLight ? 0.5 : 0.62 });
    const destructiveForeground = contrastForeground(rng, bgHue, destructive, 4.5);

    const border = hslToHex({
      h: bgHue,
      s: clamp((isLight ? lightest.hsl.s : darkest.hsl.s) * 0.2, 0, 0.12),
      l: isLight ? clamp(0.88 - surfaceOffset, 0.8, 0.92) : clamp(0.26 + surfaceOffset, 0.2, 0.34),
    });
    const input = border;
    const ring = ringFollowsAccent ? accent : primary;

    return {
      background,
      foreground,
      card,
      cardForeground,
      popover,
      popoverForeground,
      primary,
      primaryForeground,
      secondary,
      secondaryForeground,
      muted,
      mutedForeground,
      accent,
      accentForeground,
      destructive,
      destructiveForeground,
      border,
      input,
      ring,
    };
  }

  return { light: buildVariant("light"), dark: buildVariant("dark"), radius: "0.5rem" };
}

/** True once all 4 palette colors are valid hex -- gates the actions a
 * theme editor UI would use to generate or vary a palette (e.g. "Generate"
 * or "Mix it up" controls). */
export function isCompletePalette(colors: string[]): colors is [string, string, string, string] {
  return colors.length === 4 && colors.every((c) => /^#[0-9a-fA-F]{6}$/.test(c));
}

// Re-exported so callers/tests don't need to know this module's internal key
// list matches tokens.ts's -- keeps the two files honest if either changes.
export const GENERATED_TOKEN_KEYS: readonly string[] = CORE_THEME_TOKEN_KEYS;
