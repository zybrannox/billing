import { describe, expect, it } from "vitest";
import { pricingSummary, tierError } from "./itemPricing";

describe("tierError", () => {
  it("accepts sizes that go up", () => {
    expect(tierError([{ upTo: "15", amount: "150" }, { upTo: "20", amount: "200" }])).toBeNull();
    expect(tierError([])).toBeNull();
  });

  it("wants a size and a charge on every line", () => {
    expect(tierError([{ upTo: "", amount: "150" }])).toMatch(/size/);
    expect(tierError([{ upTo: "0", amount: "150" }])).toMatch(/size/);
    expect(tierError([{ upTo: "15", amount: "" }])).toMatch(/charge/);
    expect(tierError([{ upTo: "15", amount: "-1" }])).toMatch(/charge/);
  });

  it("refuses sizes out of order or repeated", () => {
    expect(tierError([{ upTo: "20", amount: "200" }, { upTo: "15", amount: "150" }])).toMatch(/smallest/);
    expect(tierError([{ upTo: "15", amount: "150" }, { upTo: "15", amount: "200" }])).toMatch(/smallest/);
  });
});

describe("pricingSummary", () => {
  it("says the rate and the minimums", () => {
    expect(pricingSummary(12, [{ up_to_sq_ft: 15, amount: 150 }])).toBe("₹12 per sq ft · Min ₹150 up to 15 sq ft");
  });

  it("copes with neither set", () => {
    expect(pricingSummary(null, null)).toBe("No default rate");
  });
});
