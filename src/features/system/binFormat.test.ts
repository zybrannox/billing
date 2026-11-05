import { describe, expect, it } from "vitest";
import { daysLeft, daysLeftLabel, daysLeftTone } from "./binFormat";

const now = new Date("2026-11-05T12:00:00Z");

describe("daysLeft", () => {
  it("starts at the full 14 days", () => {
    expect(daysLeft("2026-11-19T12:00:00Z", now)).toBe(14);
  });

  it("counts a part-day as a day", () => {
    expect(daysLeft("2026-11-05T12:30:00Z", now)).toBe(1);
    expect(daysLeft("2026-11-07T00:00:00Z", now)).toBe(2);
  });

  it("never goes negative", () => {
    expect(daysLeft("2026-11-01T00:00:00Z", now)).toBe(0);
  });
});

describe("daysLeftLabel", () => {
  it.each([
    [14, "14 days left"],
    [2, "2 days left"],
    [1, "1 day left"],
    [0, "Deleted today"],
  ])("%i reads as %s", (days, label) => {
    expect(daysLeftLabel(days)).toBe(label);
  });
});

describe("daysLeftTone", () => {
  it("only draws attention as the deadline gets close", () => {
    expect(daysLeftTone(14).fg).toContain("slate");
    expect(daysLeftTone(3).fg).toContain("amber");
    expect(daysLeftTone(1).fg).toContain("red");
  });
});
