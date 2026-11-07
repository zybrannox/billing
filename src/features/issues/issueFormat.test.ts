import { describe, expect, it } from "vitest";
import { isSendKey, issueNotice } from "./issueFormat";

describe("issueNotice", () => {
  const solved = (text: string) => ({ text, unseen: true, is_cancelled: false });

  it("names the one issue that was solved", () => {
    const items = [{ text: "Still open", unseen: false, is_cancelled: false }, solved("Printer  is\njammed")];
    expect(issueNotice(items, 1)).toBe('Your issue was solved: "Printer is jammed"');
  });

  it("says when it was cancelled rather than solved", () => {
    expect(issueNotice([{ ...solved("Printer jammed"), is_cancelled: true }], 1)).toBe('Your issue was cancelled: "Printer jammed"');
  });

  it("shortens a long issue", () => {
    const notice = issueNotice([solved("x".repeat(200))], 1);
    expect(notice).toContain(`${"x".repeat(60)}..."`);
    expect(notice).not.toContain("x".repeat(61));
  });

  it("gives a count when several were answered, solved or cancelled", () => {
    expect(issueNotice([], 3)).toBe("3 of your issues have been answered.");
  });

  it("still makes sense when the answered one is too old to be in the list", () => {
    expect(issueNotice([], 1)).toBe("Your issue has been answered.");
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
