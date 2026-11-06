import { describe, expect, it } from "vitest";
import { isSendKey, solvedNotice } from "./issueFormat";

describe("solvedNotice", () => {
  it("names the one issue that was solved", () => {
    const items = [{ text: "Still open", unseen: false }, { text: "Printer  is\njammed", unseen: true }];
    expect(solvedNotice(items, 1)).toBe('Good news! Your issue was solved: "Printer is jammed"');
  });

  it("shortens a long issue", () => {
    const notice = solvedNotice([{ text: "x".repeat(200), unseen: true }], 1);
    expect(notice).toContain(`${"x".repeat(60)}..."`);
    expect(notice).not.toContain("x".repeat(61));
  });

  it("gives a count when several were solved", () => {
    expect(solvedNotice([], 3)).toBe("Good news! 3 of your issues have been solved.");
  });

  it("still makes sense when the solved one is too old to be in the list", () => {
    expect(solvedNotice([], 1)).toBe("Good news! Your issue was solved.");
  });
});

describe("isSendKey", () => {
  it("sends on Enter", () => {
    expect(isSendKey({ key: "Enter", shiftKey: false })).toBe(true);
  });

  it("starts a new line on Shift+Enter", () => {
    expect(isSendKey({ key: "Enter", shiftKey: true })).toBe(false);
  });

  it("leaves Enter alone while a word is being composed", () => {
    expect(isSendKey({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false);
  });

  it("ignores other keys", () => {
    expect(isSendKey({ key: "a", shiftKey: false })).toBe(false);
  });
});
