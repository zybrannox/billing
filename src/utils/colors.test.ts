import { describe, expect, it } from "vitest";
import { PAYMENT_METHODS } from "../domain/paymentMethods";
import { getSemanticColor } from "./colors";

describe("status colours", () => {
  it("invoice statuses: pending blue, paid green, cancelled neutral", () => {
    expect(getSemanticColor("invoiceStatus", "pending")).toBe("var(--blue-600)");
    expect(getSemanticColor("invoiceStatus", "paid")).toBe("var(--green-600)");
    expect(getSemanticColor("invoiceStatus", "cancelled")).toBe("var(--slate-500)");
  });

  it("a converted quotation reads as accepted; rejected is neutral", () => {
    expect(getSemanticColor("quotationStatus", "converted")).toBe(getSemanticColor("quotationStatus", "accepted"));
    expect(getSemanticColor("quotationStatus", "rejected")).toBe("var(--slate-500)");
  });

  it("unknown values fall back to neutral rather than breaking", () => {
    expect(getSemanticColor("invoiceStatus", "mystery")).toBe("var(--slate-500)");
  });
});

describe("payment methods", () => {
  it("matches the list the backend accepts (app/invoices/model.py PaymentMethod)", () => {
    expect(PAYMENT_METHODS).toEqual(["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"]);
  });
});
