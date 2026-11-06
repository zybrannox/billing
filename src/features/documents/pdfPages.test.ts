import { describe, expect, it } from "vitest";
import { planPdfPages } from "./pdfPages";

describe("planPdfPages", () => {
  it("leaves a document that fits alone", () => {
    expect(planPdfPages(800, 1000, [100, 200])).toEqual({ scale: 1, slices: [{ start: 0, end: 800 }] });
  });

  it("shrinks a slight overflow onto one page, whole", () => {
    const plan = planPdfPages(1250, 1000, [100, 900, 1100]);
    expect(plan.scale).toBeCloseTo(0.8);
    expect(plan.slices).toEqual([{ start: 0, end: 1250 }]);
  });

  it("breaks a long document only at safe places, at full size", () => {
    const plan = planPdfPages(2500, 1000, [400, 950, 1100, 1800, 1990, 2400]);
    expect(plan.scale).toBe(1);
    expect(plan.slices).toEqual([
      { start: 0, end: 950 },
      { start: 950, end: 1800 },
      { start: 1800, end: 2500 },
    ]);
  });

  it("cuts at the page limit only when nothing on the page is safe", () => {
    expect(planPdfPages(2500, 1000, []).slices).toEqual([
      { start: 0, end: 1000 },
      { start: 1000, end: 2000 },
      { start: 2000, end: 2500 },
    ]);
  });

  it("always covers the whole document with no gaps", () => {
    const { slices } = planPdfPages(5300, 1000, [333, 666, 999, 1400, 2300, 3100, 4200]);
    expect(slices[0].start).toBe(0);
    expect(slices.at(-1)?.end).toBe(5300);
    slices.slice(1).forEach((slice, i) => expect(slice.start).toBe(slices[i].end));
  });
});
