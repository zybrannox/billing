import { describe, expect, it } from "vitest";
import { formatAmount, formatInr, formatPlain, formatRupees, formatRupeesFixed, formatRupeesWhole } from "./money";
import { formatLongDate, formatShortDate } from "./date";
import { formatPhone } from "./phone";

describe("money", () => {
  it("groups the Indian way, whatever the viewer's locale", () => {
    expect(formatRupeesWhole(1234567)).toBe("₹12,34,567");
    expect(formatRupees(100000)).toBe("₹1,00,000");
  });

  it("whole drops paise, auto keeps up to two, fixed always shows two", () => {
    expect(formatRupeesWhole(1234.56)).toBe("₹1,235");
    expect(formatRupees(1234.5)).toBe("₹1,234.5");
    expect(formatRupees(1234)).toBe("₹1,234");
    expect(formatRupeesFixed(1234)).toBe("₹1,234.00");
  });

  it("shows negatives with a proper minus before the symbol", () => {
    expect(formatRupees(-200)).toBe("−₹200");
    expect(formatRupeesFixed(-0.5)).toBe("−₹0.50");
  });

  it("has symbol-less and INR forms for printed documents", () => {
    expect(formatAmount(3000)).toBe("3,000.00");
    expect(formatInr(45020)).toBe("INR 45,020.00");
    expect(formatPlain(10)).toBe("10");
  });
});

describe("dates", () => {
  it("long form matches the printed documents", () => {
    expect(formatLongDate("2026-10-18T12:00:00")).toBe("18 October 2026");
    expect(formatLongDate(undefined)).toBe("");
    expect(formatLongDate("nonsense")).toBe("");
  });

  it("short form", () => {
    expect(formatShortDate(new Date(2026, 9, 5))).toBe("5 Oct 2026");
  });
});

describe("phone", () => {
  it.each([
    ["9876543210", "98765 43210"],
    ["+919876543210", "+91 98765 43210"],
    ["91 98765-43210", "+91 98765 43210"],
    ["  ", ""],
    [null, ""],
  ])("formats %j", (input, expected) => {
    expect(formatPhone(input as string | null)).toBe(expected);
  });

  it("leaves anything it doesn't recognise exactly as typed", () => {
    expect(formatPhone("+1 (555) 010-9999")).toBe("+1 (555) 010-9999");
    expect(formatPhone("12345")).toBe("12345");
  });
});
