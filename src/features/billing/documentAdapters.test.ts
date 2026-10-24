import { describe, expect, it } from "vitest";
import type { InvoiceDetail } from "./invoiceSheetUtils";
import { invoiceToDocument, quotationToDocument, sampleInvoiceDocument } from "./documentAdapters";
import { DEFAULT_DOCUMENT_SETTINGS } from "../documents/documentSettings";

const settings = DEFAULT_DOCUMENT_SETTINGS;

describe("invoice adapter", () => {
  it("shows Total due when nothing has been paid", () => {
    const doc = invoiceToDocument(
      { ...baseInvoice(), advance_amount: 0, balance_due: 1000, amount: 1000, payments: [] },
      settings,
    );
    expect(doc.totals.finalLabel).toBe("Total due");
    expect(doc.totals.finalAmount).toBe("INR 1,000.00");
    expect(doc.totals.paid).toBeUndefined();
  });

  it("shows Total, Amount paid and Amount due once payments exist", () => {
    const doc = invoiceToDocument(baseInvoice(), settings);
    expect(doc.totals).toMatchObject({
      finalLabel: "Amount due",
      total: "INR 1,000.00",
      paid: "INR 400.00",
      finalAmount: "INR 600.00",
    });
  });

  it("describes measured and Others lines differently", () => {
    const doc = sampleInvoiceDocument(settings);
    expect(doc.lines[0].detail).toBe("10' x 30' (300 sq ft) @ 10 per sq ft");
    expect(doc.lines[1].detail).toBe("@ 650 per unit");
  });

  it("hides the rate for a manually typed total", () => {
    const inv = baseInvoice();
    inv.items = [{ ...inv.items[0], is_manual_total: true }];
    const line = invoiceToDocument(inv, settings).lines[0];
    expect(line.rate).toBe("-");
    expect(line.detail).not.toMatch(/@/);
  });

  it("marks negative ledger entries as adjustments", () => {
    const inv = baseInvoice();
    inv.payments = [{ id: 1, amount: -200, payment_method: "Cash", payment_reference: null, paid_at: "2026-10-01T00:00:00", recorded_by: null }];
    expect(invoiceToDocument(inv, settings).payments[0]).toMatchObject({ method: "Adjustment", amount: "-INR 200.00" });
  });

  it("includes company details in the Billed To block", () => {
    const party = sampleInvoiceDocument(settings).billedTo;
    expect(party.name).toBe("Sample Customer");
    expect(party.lines).toContain("Sample Traders");
  });

  it("flags a cancelled invoice", () => {
    expect(invoiceToDocument({ ...baseInvoice(), status: "cancelled" }, settings).notice).toBe("CANCELLED");
  });
});

describe("quotation adapter", () => {
  it("labels the document and uses the quotation terms", () => {
    const doc = quotationToDocument(
      { quotation_number: "Q-1", created_at: "2026-10-01T00:00:00", valid_until: null, project_type: "Flex", subtotal: 100, discount_amount: 10, amount: 90, customer: null, items: [] },
      settings,
      "Accepted",
    );
    expect(doc.label).toBe("QUOTATION");
    expect(doc.totals.discount).toBe("INR 10.00");
    expect(doc.totals.finalLabel).toBe("Estimated total");
    expect(doc.terms).toBe(settings.quotation_terms);
    expect(doc.notice).toBe("Accepted");
  });
});

function baseInvoice(): InvoiceDetail {
  return {
    id: 1,
    project_id: 1,
    invoice_number: "INV-2026-00001",
    subtotal: 1000,
    discount_amount: 0,
    amount: 1000,
    status: "pending",
    created_at: "2026-10-18T12:00:00",
    due_date: null,
    advance_amount: 400,
    payment_method: "Cash",
    payment_reference: null,
    balance_due: 600,
    customer_name: null,
    project_type: null,
    project_description: null,
    project: null,
    customer: null,
    items: [
      { id: 1, description: "Banner", width: 10, height: 10, unit: "ft", sq_ft: 100, rate: 10, pieces: 1, total: 1000, is_manual_total: false, has_dimensions: true, sort_order: 0 },
    ],
    payments: [{ id: 1, amount: 400, payment_method: "Cash", payment_reference: "r1", paid_at: "2026-10-18T12:00:00", recorded_by: "alan" }],
  };
}
