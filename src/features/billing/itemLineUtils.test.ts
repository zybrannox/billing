import { describe, expect, it } from "vitest";
import {
  checkRow,
  invalidRowMessage,
  isOthersType,
  newRow,
  rowToItemPayload,
  sqFtOf,
  totalDisplayOf,
  totalOf,
  type ItemRow,
} from "./itemLineUtils";

const row = (patch: Partial<ItemRow> = {}): ItemRow => ({ ...newRow(), ...patch });

describe("area and totals", () => {
  it("computes area and total for a measured line in feet", () => {
    const r = row({ width: "10", height: "30", rate: "10", pieces: "1" });
    expect(sqFtOf(r)).toBe(300);
    expect(totalOf(r)).toBe(3000);
  });

  it("converts inches to square feet", () => {
    const r = row({ width: "24", height: "12", unit: "in", rate: "10", pieces: "1" });
    expect(sqFtOf(r)).toBe(2);
    expect(totalOf(r)).toBe(20);
  });

  it("multiplies the total by pieces, not the area", () => {
    const r = row({ width: "8", height: "4", rate: "10", pieces: "4" });
    expect(sqFtOf(r)).toBe(32);
    expect(totalOf(r)).toBe(1280);
  });
});

describe('"Others" lines', () => {
  it("is matched case-insensitively and in both spellings", () => {
    expect(["Others", "others", " OTHER "].every(isOthersType)).toBe(true);
    expect(isOthersType("Flex")).toBe(false);
  });

  it("has no area and totals as rate x pieces", () => {
    const r = row({ itemType: "Others", rate: "250", pieces: "3" });
    expect(sqFtOf(r)).toBe(0);
    expect(totalOf(r)).toBe(750);
    expect(totalDisplayOf(r)).toBe("750.00");
  });

  it("sends has_dimensions:false and no width/height", () => {
    const payload = rowToItemPayload(row({ itemType: "Others", description: " Install ", rate: "100", pieces: "2" }));
    expect(payload).toMatchObject({ has_dimensions: false, rate: 100, pieces: 2, description: "Install" });
    expect(payload).not.toHaveProperty("width");
  });
});

describe("row validation", () => {
  it("skips an untouched row", () => {
    expect(checkRow(row())).toBe("empty");
  });

  it("accepts a complete measured row", () => {
    expect(checkRow(row({ width: "5", height: "3", rate: "10" }))).toBe("ok");
  });

  it("rejects a partly filled or non-positive measured row", () => {
    expect(checkRow(row({ width: "5", rate: "10" }))).toBe("invalid");
    expect(checkRow(row({ width: "0", height: "3", rate: "10" }))).toBe("invalid");
  });

  it("rejects fractional or zero pieces", () => {
    expect(checkRow(row({ width: "5", height: "3", rate: "10", pieces: "1.5" }))).toBe("invalid");
    expect(checkRow(row({ width: "5", height: "3", rate: "10", pieces: "0" }))).toBe("invalid");
  });

  it('only needs a rate for an "Others" row, and a zero rate is allowed', () => {
    expect(checkRow(row({ itemType: "Others", rate: "0" }))).toBe("ok");
    expect(checkRow(row({ itemType: "Others", description: "x" }))).toBe("invalid");
  });

  it("explains each kind of failure differently", () => {
    expect(invalidRowMessage(row())).toMatch(/width, height/);
    expect(invalidRowMessage(row({ itemType: "Others" }))).toMatch(/Others/);
  });
});

describe("rowToItemPayload file link", () => {
  it("sends the file a line was started from, and nothing for hand-typed lines", () => {
    const fromFile = { ...newRow("Flex – front", 800, 600, 42), width: "2", height: "3", rate: "10" };
    expect(rowToItemPayload(fromFile)).toMatchObject({ project_file_id: 42 });
    const typed = { ...newRow("Custom"), width: "2", height: "3", rate: "10" };
    expect(rowToItemPayload(typed)).not.toHaveProperty("project_file_id");
  });
});
