import { describe, expect, it } from "vitest";
import { checkInvoiceAmounts } from "./invoiceAmounts";

const base = { subtotal: 1000, discountAmount: "", advanceAmount: "", paymentMethod: "" };

describe("checkInvoiceAmounts", () => {
  it("accepts nothing filled in", () => {
    expect(checkInvoiceAmounts(base)).toEqual({});
  });

  it("refuses a discount over the subtotal, but allows all of it", () => {
    expect(checkInvoiceAmounts({ ...base, discountAmount: "1001" }).discountError).toBeTruthy();
    expect(checkInvoiceAmounts({ ...base, discountAmount: "1000" })).toEqual({});
  });

  it("wants a payment method with an advance", () => {
    expect(checkInvoiceAmounts({ ...base, advanceAmount: "100" }).advanceError).toMatch(/payment method/);
    expect(checkInvoiceAmounts({ ...base, advanceAmount: "100", paymentMethod: "Cash" })).toEqual({});
  });

  it("judges an advance against the discounted total", () => {
    const amounts = { ...base, discountAmount: "500", paymentMethod: "Cash" };
    expect(checkInvoiceAmounts({ ...amounts, advanceAmount: "501" }).advanceError).toMatch(/more than/);
    expect(checkInvoiceAmounts({ ...amounts, advanceAmount: "500" })).toEqual({});
  });

  it("ignores a zero advance", () => {
    expect(checkInvoiceAmounts({ ...base, advanceAmount: "0" })).toEqual({});
  });
});
