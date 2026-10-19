// Palette for the in-app invoice/quotation *forms* and line-item blocks
// (see InvoiceDocument.tsx). The printed document has its own, admin-
// configurable theme - see src/documents/documentTheme.ts.
export const invoiceTheme = {
  ink: "#1b1a17", // near-black, warm rather than blue-black
  inkMuted: "#6f6a5f", // secondary text - dates, reference notes
  label: "#8f8a7d", // uppercase micro-labels (Billed To, Item, etc.)
  accent: "#c1512f", // muted terracotta - used only for the brand mark/document label/section labels
  hairline: "rgba(27, 26, 23, 0.1)",
};
