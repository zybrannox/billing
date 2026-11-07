import { describe, expect, it } from "vitest";
import { periodLabel, periodRange } from "./statementPeriod";

const now = new Date(2026, 10, 7, 15, 30); // 7 Nov 2026, afternoon

describe("periodRange", () => {
  it("covers the whole of this month", () => {
    expect(periodRange("this_month", now)).toEqual({ from: new Date(2026, 10, 1), to: new Date(2026, 11, 1) });
  });

  it("covers the whole of last month", () => {
    expect(periodRange("last_month", now)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) });
  });

  it("covers this month and the two before it", () => {
    expect(periodRange("last_3_months", now)).toEqual({ from: new Date(2026, 8, 1), to: new Date(2026, 11, 1) });
  });

  it("covers the calendar year", () => {
    expect(periodRange("this_year", now)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) });
  });

  it("goes back across a new year", () => {
    expect(periodRange("last_month", new Date(2027, 0, 10))).toEqual({ from: new Date(2026, 11, 1), to: new Date(2027, 0, 1) });
  });

  it("has no limits for all time", () => {
    expect(periodRange("all", now)).toEqual({});
  });
});

describe("periodLabel", () => {
  it("names the first and last day", () => {
    expect(periodLabel("last_month", now)).toBe("1 Oct 2026 – 31 Oct 2026");
  });

  it("reads plainly for all time", () => {
    expect(periodLabel("all", now)).toBe("All bills to date");
  });
});
