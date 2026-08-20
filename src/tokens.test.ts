import { describe, expect, it } from "vitest";
import {
  CORE_THEME_TOKEN_KEYS,
  cssVarName,
  defineVocabulary,
  isValidHexColor,
  isValidRadius,
  normalizeHexInput,
  themeTokensToCss,
  type ThemeTokens,
} from "./tokens";

const tokens: ThemeTokens = {
  light: Object.fromEntries(CORE_THEME_TOKEN_KEYS.map((k) => [k, "#123634"])) as ThemeTokens["light"],
  dark: Object.fromEntries(CORE_THEME_TOKEN_KEYS.map((k) => [k, "#eef2e3"])) as ThemeTokens["dark"],
  radius: "0.75rem",
};

describe("vocabulary", () => {
  it("has the 19 core keys", () => {
    expect(CORE_THEME_TOKEN_KEYS).toHaveLength(19);
    expect(CORE_THEME_TOKEN_KEYS).toContain("primaryForeground");
  });

  it("appends extension keys without mutating the core", () => {
    const v = defineVocabulary(["positive", "positiveForeground"]);
    expect(v.keys).toHaveLength(21);
    expect(v.extensions).toEqual(["positive", "positiveForeground"]);
    expect(CORE_THEME_TOKEN_KEYS).toHaveLength(19);
  });

  it("rejects an extension that collides with a core key", () => {
    expect(() => defineVocabulary(["primary"])).toThrow(/already a core token/);
  });

  it("rejects a duplicate extension key", () => {
    expect(() => defineVocabulary(["positive", "positive"])).toThrow(/duplicate/);
  });
});

describe("validators", () => {
  it("accepts 6-digit hex only", () => {
    expect(isValidHexColor("#123634")).toBe(true);
    expect(isValidHexColor("#123")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
  });

  it("prepends # to a bare 6-digit hex", () => {
    expect(normalizeHexInput("CFEBFF")).toBe("#CFEBFF");
    expect(normalizeHexInput("#CFEBFF")).toBe("#CFEBFF");
    expect(normalizeHexInput("CFE")).toBe("CFE");
  });

  it("accepts px and rem radii only", () => {
    expect(isValidRadius("0.75rem")).toBe(true);
    expect(isValidRadius("12px")).toBe(true);
    expect(isValidRadius("12")).toBe(false);
  });

  it("kebab-cases camelCase keys", () => {
    expect(cssVarName("cardForeground")).toBe("--card-foreground");
    expect(cssVarName("ring")).toBe("--ring");
  });
});

describe("themeTokensToCss", () => {
  it("emits :root and .dark blocks with the radius", () => {
    const css = themeTokensToCss(tokens, defineVocabulary());
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
    expect(css).toContain("--radius: 0.75rem;");
    expect(css).toContain("--card-foreground: #123634;");
  });

  it("emits extension tokens when the vocabulary declares them", () => {
    const v = defineVocabulary(["positive"]);
    const withPositive: ThemeTokens = {
      light: { ...tokens.light, positive: "#0a7d32" },
      dark: { ...tokens.dark, positive: "#5fc27a" },
      radius: tokens.radius,
    };
    expect(themeTokensToCss(withPositive, v)).toContain("--positive: #0a7d32;");
  });

  it("skips invalid values instead of injecting unsafe CSS", () => {
    const bad: ThemeTokens = {
      light: { ...tokens.light, primary: "javascript:alert(1)" },
      dark: tokens.dark,
      radius: "nonsense",
    };
    const css = themeTokensToCss(bad, defineVocabulary());
    expect(css).not.toContain("javascript");
    expect(css).not.toContain("--radius");
  });

  it("scopes both blocks when given a selector", () => {
    const css = themeTokensToCss(tokens, defineVocabulary(), "#preview");
    expect(css).toContain("#preview {");
    expect(css).toContain("#preview.dark, #preview .dark {");
  });
});
