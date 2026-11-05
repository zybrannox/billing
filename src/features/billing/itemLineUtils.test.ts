import { describe, expect, it } from "vitest";
import {
  checkRow,
  copyRow,
  invalidRowMessage,
  isOthersType,
  minimumChargeOf,
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

describe("copyRow", () => {
  it("copies every field under a new key", () => {
    const original = row({ itemType: "Vinyl", description: "Front", width: "8", height: "4", unit: "in", rate: "10", pieces: "3", total: "90", projectFileId: 7 });
    const copy = copyRow(original);
    expect(copy.key).not.toBe(original.key);
    expect({ ...copy, key: original.key }).toEqual(original);
  });
});

describe("custom item types", () => {
  const measured = { width: "8", height: "4", rate: "10" };

  it("bills a custom type by area, like any catalog type", () => {
    const r = row({ itemType: "Acrylic letters", ...measured });
    expect(isOthersType(r.itemType)).toBe(false);
    expect(totalOf(r)).toBe(320);
    expect(checkRow(r)).toBe("ok");
  });

  it("names the line after the type when there is no description", () => {
    expect(rowToItemPayload(row({ itemType: " Acrylic letters ", ...measured })).description).toBe("Acrylic letters");
  });

  it("prefers a description the user wrote", () => {
    expect(rowToItemPayload(row({ itemType: "Acrylic letters", description: "Shop sign", ...measured })).description).toBe("Shop sign");
  });

  it("does not name a line 'Others'", () => {
    expect(rowToItemPayload(row({ itemType: "Others", rate: "10" })).description).toBeUndefined();
  });
});

describe("minimum charges", () => {
  const flex = [
    { up_to_sq_ft: 15, amount: 150 },
    { up_to_sq_ft: 20, amount: 200 },
  ];
  const row = (patch: Partial<ItemRow>): ItemRow => ({ ...newRow(), minCharges: flex, itemType: "Flex", rate: "5", ...patch });

  it("charges the minimum when the rate comes to less", () => {
    expect(totalOf(row({ width: "3", height: "3" }))).toBe(150); // 9 sq ft at 5 = 45
    expect(totalOf(row({ width: "4", height: "4" }))).toBe(200); // 16 sq ft at 5 = 80
  });

  it("treats the edges of each size band correctly", () => {
    expect(totalOf(row({ width: "5", height: "3" }))).toBe(150); // exactly 15
    expect(totalOf(row({ width: "5.2", height: "3" }))).toBe(200); // 15.6: above 15, so the next band
    expect(totalOf(row({ width: "5", height: "4" }))).toBe(200); // exactly 20
    expect(totalOf(row({ width: "7", height: "3" }))).toBe(105); // 21: past the minimums, charged by rate
  });

  it("charges the rate when that comes to more than the minimum", () => {
    expect(totalOf(row({ width: "3", height: "3", rate: "20" }))).toBe(180);
    expect(minimumChargeOf(row({ width: "3", height: "3", rate: "20" }))).toBeNull();
  });

  it("sizes a line by all its pieces", () => {
    expect(totalOf(row({ width: "4", height: "2", pieces: "2" }))).toBe(200); // 16 sq ft in all
    expect(totalOf(row({ width: "2", height: "2", pieces: "6" }))).toBe(120); // 24 sq ft: by rate
  });

  it("converts inches before choosing the band", () => {
    expect(totalOf(row({ width: "48", height: "48", unit: "in" }))).toBe(200); // 16 sq ft
  });

  it("lets a total typed by hand go below the minimum", () => {
    const typed = row({ width: "3", height: "3", total: "100", rate: "11.111111" });
    expect(minimumChargeOf(typed)).toBeNull();
    expect(totalDisplayOf(typed)).toBe("100");
  });

  it("leaves a deliberately free item free", () => {
    expect(totalOf(row({ width: "3", height: "3", rate: "0" }))).toBe(0);
  });

  it("prices a line with no rate at all from the minimum", () => {
    const noRate = row({ width: "3", height: "3", rate: "" });
    expect(totalOf(noRate)).toBe(150);
    expect(checkRow(noRate)).toBe("ok");
    expect(checkRow(row({ width: "7", height: "3", rate: "" }))).toBe("invalid"); // past the minimums, needs a rate
  });

  it("does nothing for types without minimums, or before a size is known", () => {
    expect(totalOf(row({ width: "3", height: "3", minCharges: null }))).toBe(45);
    expect(minimumChargeOf(row({ width: "", height: "" }))).toBeNull();
  });

  it("sends a rate that comes to exactly the minimum, marked as an entered total", () => {
    const payload = rowToItemPayload(row({ width: "3.3", height: "2.1" }));
    expect(payload.is_manual_total).toBe(true);
    expect(Math.round(6.93 * payload.rate * 100) / 100).toBe(150);
  });

  it("sends the real rate when the minimum isn't in play", () => {
    const payload = rowToItemPayload(row({ width: "7", height: "3" }));
    expect(payload.rate).toBe(5);
    expect(payload.is_manual_total).toBe(false);
  });

  it("keeps a copied line's minimums", () => {
    expect(totalOf(copyRow(row({ width: "3", height: "3" })))).toBe(150);
  });
});
