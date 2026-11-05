import { describe, expect, it } from "vitest";
import { isDetailRow, withDetailRow } from "./detailRows";

describe("withDetailRow", () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it("puts the panel right after its parent", () => {
    expect(withDetailRow(rows, 2)).toEqual([{ id: 1 }, { id: 2 }, { id: "2__detail", __detailPanelFor: 2 }, { id: 3 }]);
  });

  it("changes nothing when the expanded row isn't on this page", () => {
    expect(withDetailRow(rows, 99)).toEqual(rows);
  });
});

describe("isDetailRow", () => {
  it("tells panels from real rows", () => {
    expect(isDetailRow({ id: "1__detail", __detailPanelFor: 1 })).toBe(true);
    expect(isDetailRow({ id: 1 })).toBe(false);
    expect(isDetailRow(null)).toBe(false);
    expect(isDetailRow(undefined)).toBe(false);
  });
});
