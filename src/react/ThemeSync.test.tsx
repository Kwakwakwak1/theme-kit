import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CORE_THEME_TOKEN_KEYS, defineVocabulary, type ThemeTokens } from "../tokens";
import { ThemeSync } from "./ThemeSync";

const tokens: ThemeTokens = {
  light: Object.fromEntries(CORE_THEME_TOKEN_KEYS.map((k) => [k, "#123634"])) as ThemeTokens["light"],
  dark: Object.fromEntries(CORE_THEME_TOKEN_KEYS.map((k) => [k, "#eef2e3"])) as ThemeTokens["dark"],
  radius: "0.75rem",
};

const vocabulary = defineVocabulary();

describe("ThemeSync", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    localStorage.clear();
  });

  it("injects a style element with the resolved tokens", () => {
    render(<ThemeSync tokens={tokens} vocabulary={vocabulary} storageKey="fp-theme-tokens" />);
    const el = document.getElementById("custom-theme-override");
    expect(el?.textContent).toContain("--primary: #123634;");
  });

  it("caches the tokens under the app's storage key", () => {
    render(<ThemeSync tokens={tokens} vocabulary={vocabulary} storageKey="fp-theme-tokens" />);
    expect(JSON.parse(localStorage.getItem("fp-theme-tokens")!)).toEqual(tokens);
    expect(localStorage.getItem("kp-theme-tokens")).toBeNull();
  });

  it("leaves the existing style in place when tokens go null", () => {
    const { rerender } = render(
      <ThemeSync tokens={tokens} vocabulary={vocabulary} storageKey="fp-theme-tokens" />,
    );
    rerender(<ThemeSync tokens={null} vocabulary={vocabulary} storageKey="fp-theme-tokens" />);
    expect(document.getElementById("custom-theme-override")?.textContent).toContain("--primary:");
  });

  it("reuses one style element across updates", () => {
    const { rerender } = render(
      <ThemeSync tokens={tokens} vocabulary={vocabulary} storageKey="fp-theme-tokens" />,
    );
    rerender(
      <ThemeSync
        tokens={{ ...tokens, light: { ...tokens.light, primary: "#ff0000" } }}
        vocabulary={vocabulary}
        storageKey="fp-theme-tokens"
      />,
    );
    expect(document.querySelectorAll("#custom-theme-override")).toHaveLength(1);
    expect(document.getElementById("custom-theme-override")!.textContent).toContain("--primary: #ff0000;");
  });
});
