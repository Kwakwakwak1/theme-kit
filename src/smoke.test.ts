import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "./index";

describe("package scaffold", () => {
  it("exports a barrel that loads", () => {
    expect(PACKAGE_NAME).toBe("@kwakwakwak1/theme-kit");
  });
});
