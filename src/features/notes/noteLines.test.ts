import { describe, expect, it } from "vitest";
import { noteToLines } from "./noteLines";

describe("noteToLines", () => {
  it("makes each line of a note a line on the bill", () => {
    expect(noteToLines("Flex banner 8x4\nName board")).toEqual(["Flex banner 8x4", "Name board"]);
  });

  it("ignores blank lines and stray spaces", () => {
    expect(noteToLines("  One  \n\n\r\n  Two\r\n")).toEqual(["One", "Two"]);
  });

  it("keeps each line within what an invoice line can hold", () => {
    expect(noteToLines("x".repeat(400))[0]).toHaveLength(255);
  });

  it("gives an empty note no lines", () => {
    expect(noteToLines("   \n ")).toEqual([]);
  });
});
