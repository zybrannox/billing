import { describe, expect, it } from "vitest";
import { autoAllocate, checkSplit, toAllocations } from "./allocation";

const invoices = [
  { id: 1, balance_due: 3000 },
  { id: 2, balance_due: 3500 },
  { id: 3, balance_due: 2500 },
];

describe("autoAllocate", () => {
  it("fills the oldest invoices first", () => {
    expect(autoAllocate(8000, invoices)).toEqual({ 1: 3000, 2: 3500, 3: 1500 });
  });
  it("leaves the rest as credit when it's more than owed", () => {
    expect(autoAllocate(10000, invoices)).toEqual({ 1: 3000, 2: 3500, 3: 2500 });
  });
  it("handles paise without float drift", () => {
    expect(autoAllocate(0.3, [{ id: 1, balance_due: 0.1 }, { id: 2, balance_due: 0.2 }])).toEqual({ 1: 0.1, 2: 0.2 });
  });
  it("gives nothing for no money", () => {
    expect(autoAllocate(0, invoices)).toEqual({});
    expect(autoAllocate(Number.NaN, invoices)).toEqual({});
  });
});

describe("checkSplit", () => {
  it("adds up what's applied and what's left", () => {
    expect(checkSplit(8000, invoices, { 1: "3000", 2: "", 3: "1000" })).toMatchObject({ applied: 4000, left: 4000, error: "" });
  });
  it("refuses more than an invoice's balance", () => {
    const check = checkSplit(8000, invoices, { 1: "3000.01" });
    expect(check.invoiceErrors[1]).toBeTruthy();
    expect(check.error).toBeTruthy();
  });
  it("refuses more than the payment", () => {
    expect(checkSplit(5000, invoices, { 1: "3000", 2: "2500" }).error).toMatch(/more than the payment/);
  });
  it("refuses something that isn't a number", () => {
    expect(checkSplit(5000, invoices, { 1: "abc" }).invoiceErrors[1]).toBeTruthy();
  });
});

describe("toAllocations", () => {
  it("sends only invoices that get something", () => {
    expect(toAllocations(invoices, { 1: "3000", 2: "0", 3: "" })).toEqual([{ invoice_id: 1, amount: 3000 }]);
  });
});
