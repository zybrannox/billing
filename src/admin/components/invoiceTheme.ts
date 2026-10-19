// Palette for the in-app invoice/quotation *forms* and line-item blocks
// (see InvoiceDocument.tsx). The printed document has its own, admin-
// configurable theme - see src/documents/documentTheme.ts.
import { documentTokens } from "../../theme/tokens";

export const invoiceTheme = {
  ink: documentTokens.warm.ink, // near-black, warm rather than blue-black
  inkMuted: documentTokens.warm.inkMuted, // secondary text - dates, reference notes
  label: documentTokens.warm.label, // uppercase micro-labels (Billed To, Item, etc.)
  accent: documentTokens.warm.accent, // muted terracotta - used only for the brand mark/document label/section labels
  hairline: "rgba(27, 26, 23, 0.1)",
};
