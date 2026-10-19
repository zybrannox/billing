/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokensToCss } from "./generateCss";
import { palette } from "./tokens";

describe("design tokens", () => {
  it("the committed generated CSS is up to date (run `pnpm tokens` if this fails)", () => {
    const committed = readFileSync(new URL("./tokens.generated.css", import.meta.url), "utf8");
    expect(committed).toBe(tokensToCss());
  });

  it("every colour family has the full 50-900 scale, so no var(--x-NNN) can be undefined", () => {
    for (const scale of Object.values(palette)) {
      expect(Object.keys(scale).map(Number)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
    }
  });

  it("colours are plain hex (html2canvas cannot parse oklch or color-mix)", () => {
    for (const scale of Object.values(palette)) {
      for (const hex of Object.values(scale)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
