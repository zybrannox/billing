import { describe, expect, it } from "vitest";
import { formatLongDate as longDate } from "../../format/date";
import { resolveDocumentStyle, TEMPLATES } from "./documentTemplates";
import { isHexColor, resolveDocumentTheme, THEME_PRESETS, tint } from "./documentTheme";

describe("theme resolution", () => {
  it("uses the preset colour and white text on dark accents", () => {
    const t = resolveDocumentTheme({ theme: "indigo", custom_color: null });
    expect(t.primary).toBe(THEME_PRESETS[0].color);
    expect(t.onPrimary).toBe("#ffffff");
  });

  it("switches to dark text on a pale custom colour", () => {
    expect(resolveDocumentTheme({ theme: "custom", custom_color: "#ffee99" }).onPrimary).toBe("#111827");
  });

  it("ignores an invalid custom colour and falls back to the default preset", () => {
    expect(resolveDocumentTheme({ theme: "custom", custom_color: "red" }).primary).toBe(THEME_PRESETS[0].color);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("#a1b2c3")).toBe(true);
  });

  it("falls back to the default for an unknown theme name", () => {
    expect(resolveDocumentTheme({ theme: "nope", custom_color: null }).primary).toBe(THEME_PRESETS[0].color);
  });

  it("builds an alpha tint from a hex colour", () => {
    expect(tint("#336699", 0.5)).toBe("#33669980");
  });
});

describe("templates", () => {
  it("every listed template resolves to a complete style", () => {
    for (const { key } of TEMPLATES) {
      const s = resolveDocumentStyle({ template: key, theme: "teal", custom_color: null });
      expect(s.tableHeader).toBeDefined();
      expect(s.totalBar).toBeDefined();
      expect(s.primary).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("minimal has no top bar or filled header; classic does", () => {
    const classic = resolveDocumentStyle({ template: "classic", theme: "indigo", custom_color: null });
    const minimal = resolveDocumentStyle({ template: "minimal", theme: "indigo", custom_color: null });
    expect(classic.supportsTopBar).toBe(true);
    expect(minimal.supportsTopBar).toBe(false);
    expect(minimal.tableHeader.bg).toBe("transparent");
    expect(classic.tableHeader.bg).toBe(classic.primary);
  });

  it("falls back to classic for an unknown template", () => {
    const s = resolveDocumentStyle({ template: "ghost", theme: "indigo", custom_color: null });
    expect(s.tableHeader.bg).toBe(s.primary);
  });
});

describe("longDate", () => {
  it("formats like the reference documents and tolerates bad input", () => {
    expect(longDate("2026-10-18T12:00:00")).toBe("18 October 2026");
    expect(longDate(null)).toBe("");
    expect(longDate("garbage")).toBe("");
  });
});
