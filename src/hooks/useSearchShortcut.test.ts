import { describe, expect, it } from "vitest";
import { shouldFocusSearch } from "./useSearchShortcut";

const press = (over: object = {}) =>
  ({ key: "/", ctrlKey: false, metaKey: false, altKey: false, target: { tagName: "DIV" }, ...over }) as unknown as KeyboardEvent;

describe("shouldFocusSearch", () => {
  it("jumps to search from the page", () => {
    expect(shouldFocusSearch(press(), false)).toBe(true);
  });

  it("ignores other keys", () => {
    expect(shouldFocusSearch(press({ key: "a" }), false)).toBe(false);
  });

  it.each(["INPUT", "TEXTAREA", "SELECT"])("leaves the key alone while typing in a %s", (tagName) => {
    expect(shouldFocusSearch(press({ target: { tagName } }), false)).toBe(false);
  });

  it("leaves the key alone in editable text", () => {
    expect(shouldFocusSearch(press({ target: { tagName: "DIV", isContentEditable: true } }), false)).toBe(false);
  });

  it("leaves browser shortcuts alone", () => {
    expect(shouldFocusSearch(press({ ctrlKey: true }), false)).toBe(false);
    expect(shouldFocusSearch(press({ metaKey: true }), false)).toBe(false);
    expect(shouldFocusSearch(press({ altKey: true }), false)).toBe(false);
  });

  it("stays out of the way while a dialog is open", () => {
    expect(shouldFocusSearch(press(), true)).toBe(false);
  });
});
