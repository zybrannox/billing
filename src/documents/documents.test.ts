import { describe, expect, it } from "vitest";
import type { InvoiceDetail } from "../admin/components/invoiceSheetUtils";
import { invoiceToDocument, longDate, quotationToDocument, sampleInvoiceDocument } from "./documentAdapters";
import { DEFAULT_DOCUMENT_SETTINGS } from "./documentSettings";
import { resolveDocumentStyle, TEMPLATES } from "./documentTemplates";
import { isHexColor, resolveDocumentTheme, THEME_PRESETS, tint } from "./documentTheme";

const settings = DEFAULT_DOCUMENT_SETTINGS;

describe("theme resolution", () => {
  it("uses the preset colour and white text on dark accents", () => {
    const t = resolveDocumentTheme({ theme: "indigo", custom_color: null });
    expect(t.primary).toBe(THEME_PRESETS[0].color);
    expect(t.onPrimary).toBe("#ffffff");
  });

  it("switches to dark text on a pale custom colour", () => {
    expect(resolveDocumentTheme({ theme: "custom", custom_color: "#ffee99" }).onPrimary).toBe("#111827");
  });

  it("ignores an invalid custom colour and falls back to the default preset", () => {
    expect(resolveDocumentTheme({ theme: "custom", custom_color: "red" }).primary).toBe(THEME_PRESETS[0].color);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("#a1b2c3")).toBe(true);
  });

  it("falls back to the default for an unknown theme name", () => {
    expect(resolveDocumentTheme({ theme: "nope", custom_color: null }).primary).toBe(THEME_PRESETS[0].color);
  });

  it("builds an alpha tint from a hex colour", () => {
    expect(tint("#336699", 0.5)).toBe("#33669980");
  });
});

describe("templates", () => {
  it("every listed template resolves to a complete style", () => {
    for (const { key } of TEMPLATES) {
      const s = resolveDocumentStyle({ template: key, theme: "teal", custom_color: null });
      expect(s.tableHeader).toBeDefined();
      expect(s.totalBar).toBeDefined();
      expect(s.primary).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("minimal has no top bar or filled header; classic does", () => {
    const classic = resolveDocumentStyle({ template: "classic", theme: "indigo", custom_color: null });
    const minimal = resolveDocumentStyle({ template: "minimal", theme: "indigo", custom_color: null });
    expect(classic.supportsTopBar).toBe(true);
    expect(minimal.supportsTopBar).toBe(false);
    expect(minimal.tableHeader.bg).toBe("transparent");
    expect(classic.tableHeader.bg).toBe(classic.primary);
  });

  it("falls back to classic for an unknown template", () => {
    const s = resolveDocumentStyle({ template: "ghost", theme: "indigo", custom_color: null });
    expect(s.tableHeader.bg).toBe(s.primary);
  });
});

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

describe("longDate", () => {
  it("formats like the reference documents and tolerates bad input", () => {
    expect(longDate("2026-10-18T12:00:00")).toBe("18 October 2026");
    expect(longDate(null)).toBe("");
    expect(longDate("garbage")).toBe("");
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
    project: null,
    customer: null,
    items: [
      { id: 1, description: "Banner", width: 10, height: 10, unit: "ft", sq_ft: 100, rate: 10, pieces: 1, total: 1000, is_manual_total: false },
    ],
    payments: [{ id: 1, amount: 400, payment_method: "Cash", payment_reference: "r1", paid_at: "2026-10-18T12:00:00", recorded_by: "alan" }],
  };
}
