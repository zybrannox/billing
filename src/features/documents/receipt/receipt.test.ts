import { describe, expect, it } from "vitest";
import type { InvoiceDetail } from "../../billing/invoiceSheetUtils";
import { DEFAULT_DOCUMENT_SETTINGS } from "../documentSettings";
import { toEscPos, toPrinterText, rawbtLink } from "./escpos";
import { fontSizeMm, PRINTABLE_MM } from "./printReceipt";
import { COLUMNS, columns, invoiceReceipt, wrap } from "./receipt";

const settings = DEFAULT_DOCUMENT_SETTINGS;

function invoice(overrides: Partial<InvoiceDetail> = {}): InvoiceDetail {
  return {
    id: 7,
    project_id: 1,
    invoice_number: "INV-2026-00007",
    status: "pending",
    subtotal: 1200,
    discount_amount: 0,
    amount: 1200,
    created_at: "2026-11-11T06:30:00Z",
    due_date: null,
    advance_amount: 500,
    payment_method: "UPI",
    payment_reference: null,
    balance_due: 700,
    customer_name: "Asha Rao",
    project_type: "Flex",
    project_description: null,
    project: null,
    customer: { first_name: "Asha", last_name: "Rao", contact_number: "9876500001", email: null },
    items: [
      { id: 1, description: "Shop front flex banner with a very long description that wraps", width: 10, height: 6, unit: "ft", sq_ft: 60, rate: 15, pieces: 1, total: 900, is_manual_total: false, has_dimensions: true, sort_order: 0, project_file_id: null },
      { id: 2, description: "Installation", width: 0, height: 0, unit: "ft", sq_ft: 0, rate: 150, pieces: 2, total: 300, is_manual_total: false, has_dimensions: false, sort_order: 1, project_file_id: null },
    ],
    payments: [{ id: 1, amount: 500, payment_method: "UPI", payment_reference: "t1", paid_at: "2026-11-11T06:30:00Z", recorded_by: "boss", customer_payment_id: null }],
    ...overrides,
  } as InvoiceDetail;
}

const texts = (lines: { text: string }[]) => lines.map((l) => l.text);

describe("wrap and columns", () => {
  it("breaks at spaces and never goes past the width", () => {
    expect(wrap("one two three four", 9)).toEqual(["one two", "three", "four"]);
    expect(wrap("abcdefghijkl", 5)).toEqual(["abcde", "fghij", "kl"]);
    expect(wrap("line one\nline two", 32)).toEqual(["line one", "line two"]);
  });
  it("puts the amount at the right edge and shortens the label if needed", () => {
    expect(columns("Total", "1,200.00", 20)).toBe("Total       1,200.00");
    const tight = columns("A very long label indeed", "1,200.00", 20);
    expect(tight).toHaveLength(20);
    expect(tight.endsWith(" 1,200.00")).toBe(true);
  });
});

describe("invoice receipt", () => {
  for (const paper of [58, 80] as const) {
    it(`fits a ${paper} mm roll`, () => {
      const cols = COLUMNS[paper];
      for (const line of invoiceReceipt(invoice(), settings, cols)) {
        expect(line.text.length).toBeLessThanOrEqual(line.big ? cols / 2 : cols);
      }
    });
  }

  it("shows the bill, every item and what's still owed", () => {
    const out = texts(invoiceReceipt(invoice(), settings, 32));
    expect(out).toContain("Bill no: INV-2026-00007");
    expect(out).toContain("Customer: Asha Rao");
    expect(out.join("\n")).toMatch(/Installation/);
    expect(out).toContain(columns("   2 x 150.00", "300.00", 32));
    expect(out).toContain(columns("TOTAL", "1,200.00", 32));
    expect(out).toContain(columns("Paid", "500.00", 32));
    expect(out).toContain(columns("BALANCE DUE", "700.00", 32));
    expect(out).toContain("Paid by: UPI");
  });

  it("shows the discount, and a paid bill as settled", () => {
    const out = texts(
      invoiceReceipt(invoice({ status: "paid", discount_amount: 200, amount: 1000, advance_amount: 1000, balance_due: 0 }), settings, 32),
    );
    expect(out).toContain(columns("Discount", "-200.00", 32));
    expect(out).toContain(columns("Balance", "0.00", 32));
  });

  it("marks a cancelled bill", () => {
    expect(texts(invoiceReceipt(invoice({ status: "cancelled" }), settings, 32))).toContain("*** CANCELLED ***");
  });
});

describe("printer commands", () => {
  it("keeps to characters the printer's font has", () => {
    expect(toPrinterText("₹500 – Flex “A” … ×2 த")).toBe('Rs.500 - Flex "A" ... x2 ?');
  });

  it("resets, sets each line's style and leaves paper to tear off", () => {
    const bytes = toEscPos([{ text: "Hi", align: "center", bold: true, big: true }]);
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x1b, 0x40]);
    expect(Array.from(bytes.slice(2, 11))).toEqual([0x1b, 0x61, 1, 0x1b, 0x45, 1, 0x1d, 0x21, 0x11]);
    expect(Array.from(bytes.slice(11, 14))).toEqual([0x48, 0x69, 0x0a]);
    expect(Array.from(bytes.slice(-3))).toEqual([0x1b, 0x64, 4]);
  });

  it("hands the receipt to RawBT", () => {
    const link = rawbtLink([{ text: "Hi" }]);
    expect(link).toMatch(/^intent:base64,[A-Za-z0-9+/=]+#Intent;scheme=rawbt;package=ru\.a402d\.rawbtprinter;end;$/);
  });
});

describe("browser printout", () => {
  it("sizes the font so a full line fills the printable width", () => {
    for (const paper of [58, 80] as const) {
      expect(fontSizeMm(paper) * 0.6 * COLUMNS[paper]).toBeCloseTo(PRINTABLE_MM[paper]);
    }
  });
});
