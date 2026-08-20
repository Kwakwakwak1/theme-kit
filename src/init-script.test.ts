import { beforeEach, describe, expect, it } from "vitest";
import { createThemeInitScript } from "./init-script";

function run(storageKey: string) {
  // eslint-disable-next-line no-new-func
  new Function(createThemeInitScript(storageKey))();
  return document.getElementById("custom-theme-override");
}

const valid = {
  light: { background: "#ffffff", primary: "#135551" },
  dark: { background: "#0c1d1a", primary: "#5fc2b6" },
  radius: "0.75rem",
};

describe("createThemeInitScript", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    localStorage.clear();
  });

  it("reads the storage key it was given", () => {
    localStorage.setItem("fp-theme-tokens", JSON.stringify(valid));
    const el = run("fp-theme-tokens");
    expect(el?.textContent).toContain("--primary: #135551;");
  });

  it("ignores another app's cache under a different key", () => {
    localStorage.setItem("kp-theme-tokens", JSON.stringify(valid));
    expect(run("fp-theme-tokens")).toBeNull();
  });

  it("emits the radius and both blocks", () => {
    localStorage.setItem("fp-theme-tokens", JSON.stringify(valid));
    const css = run("fp-theme-tokens")!.textContent!;
    expect(css).toContain("--radius: 0.75rem;");
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
  });

  it("emits extension tokens without needing to know them", () => {
    localStorage.setItem("fp-theme-tokens", JSON.stringify({
      ...valid,
      light: { ...valid.light, positive: "#0a7d32" },
    }));
    expect(run("fp-theme-tokens")!.textContent).toContain("--positive: #0a7d32;");
  });

  it("skips invalid values", () => {
    localStorage.setItem("fp-theme-tokens", JSON.stringify({
      light: { primary: "javascript:alert(1)" }, dark: {}, radius: "nonsense",
    }));
    const css = run("fp-theme-tokens")!.textContent!;
    expect(css).not.toContain("javascript");
    expect(css).not.toContain("--radius");
  });

  it("does nothing when nothing is cached", () => {
    expect(run("fp-theme-tokens")).toBeNull();
  });

  it("swallows malformed JSON rather than throwing", () => {
    localStorage.setItem("fp-theme-tokens", "{not json");
    expect(() => run("fp-theme-tokens")).not.toThrow();
  });
});
