import { describe, expect, it } from "vitest";
import { CORE_THEME_TOKEN_KEYS, isValidHexColor } from "./tokens";
import { contrastRatio, generateThemeFromPalette, isCompletePalette } from "./palette";
import { PRESET_PALETTES } from "./presets";

const palette: [string, string, string, string] = ["#0b132b", "#1c2541", "#ff6b6b", "#f9f5eb"];

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("is 1 for a color against itself", () => {
    expect(contrastRatio("#135551", "#135551")).toBeCloseTo(1, 5);
  });
});

describe("isCompletePalette", () => {
  it("requires exactly four colors", () => {
    expect(isCompletePalette(palette)).toBe(true);
    expect(isCompletePalette(["#000000"])).toBe(false);
  });
});

describe("generateThemeFromPalette", () => {
  it("emits every core token as a valid hex in both modes", () => {
    const tokens = generateThemeFromPalette(palette);
    for (const key of CORE_THEME_TOKEN_KEYS) {
      expect(isValidHexColor(tokens.light[key]), `light.${key}`).toBe(true);
      expect(isValidHexColor(tokens.dark[key]), `dark.${key}`).toBe(true);
    }
  });

  it("leaves radius empty — it cannot be derived from colors, so the caller supplies it", () => {
    expect(generateThemeFromPalette(palette).radius).toBe("");
  });

  it("is deterministic", () => {
    expect(generateThemeFromPalette(palette)).toEqual(generateThemeFromPalette(palette));
  });
});

describe("PRESET_PALETTES", () => {
  it("every preset has four valid hex colors and a unique id", () => {
    const ids = new Set<string>();
    for (const preset of PRESET_PALETTES) {
      expect(preset.colors).toHaveLength(4);
      preset.colors.forEach((c) => expect(isValidHexColor(c), `${preset.id}: ${c}`).toBe(true));
      expect(ids.has(preset.id), `duplicate id ${preset.id}`).toBe(false);
      ids.add(preset.id);
    }
  });

  it("every preset generates a complete theme", () => {
    for (const preset of PRESET_PALETTES) {
      const tokens = generateThemeFromPalette(preset.colors);
      expect(Object.keys(tokens.light).length).toBeGreaterThanOrEqual(19);
    }
  });
});
