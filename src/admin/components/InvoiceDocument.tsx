import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

// Shared chrome between the editable Create Invoice/Quotation screens and
// the read-only printable views - same document, two modes, both use this
// exact styling instead of two hand-tuned copies quietly drifting apart.
//
// Deliberately no boxed panels, no table grid/cell borders, no colored
// backgrounds - hierarchy comes from type weight/size and generous
// whitespace instead, with a single warm ink color and one muted accent
// used sparingly (the brand mark, the document label, section labels).
// The only rules that survive are thin, full-bleed hairlines used as
// section dividers (header/footer, above the grand total) - a typographic
// device every minimal invoice template (Stripe's, Anthropic's own) still
// relies on, not a "boxed table" in the sense this was asked to remove.
export const invoiceTheme = {
  ink: "#1b1a17", // near-black, warm rather than blue-black
  inkMuted: "#6f6a5f", // secondary text - dates, reference notes
  label: "#8f8a7d", // uppercase micro-labels (Billed To, Item, etc.)
  accent: "#c1512f", // muted terracotta - used only for the brand mark/document label/section labels
  hairline: "rgba(27, 26, 23, 0.1)",
};

export function InvoiceHeader({
  invoiceNumber,
  documentLabel = "INVOICE",
}: {
  invoiceNumber?: ReactNode;
  // Lets QuotationView.tsx reuse this exact same header chrome for
  // "QUOTATION" instead of forking a near-identical copy - same document,
  // different label, same reasoning as the rest of this shared file.
  documentLabel?: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        mb: 4,
        pb: 3,
        borderBottom: `1px solid ${invoiceTheme.hairline}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          component="img"
          src="/images/logo.webp"
          alt=""
          sx={{ width: 24, height: 19, objectFit: "contain" }}
        />
        <Box>
          <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2, color: invoiceTheme.ink }}>
            Zybrannox
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: invoiceTheme.inkMuted, display: "block", lineHeight: 1.3 }}>
            Printing &amp; Signage Services
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.2, color: invoiceTheme.accent }}>
          {documentLabel}
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: invoiceTheme.inkMuted, mt: 0.3 }}>
          {invoiceNumber ?? "Number assigned on generate"}
        </Typography>
      </Box>
    </Box>
  );
}

export function InvoicePanelLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: invoiceTheme.label,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Typography>
  );
}

// The "Bill To" / invoice-meta two-column block - plain text laid out in a
// grid, no surrounding box/background/border. What used to visually
// separate this from the rest of the page (a filled panel) is now just
// its own margin-bottom before the line items start.
export function InvoiceMetaPanel({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 3,
        mb: 4,
      }}
    >
      {children}
    </Box>
  );
}

// One line item - description on the left (with a muted secondary line for
// size/pieces underneath, editorial-caption style rather than its own grid
// column), amount right-aligned. No cell borders; rows are separated by a
// hairline only between them (never around the whole block, never under a
// header row), so this reads as a simple list, not a bordered table.
export function InvoiceLineItem({
  index,
  description,
  meta,
  rate,
  amount,
  isFirst,
}: {
  index: number;
  description: ReactNode;
  meta?: ReactNode;
  rate?: ReactNode;
  amount: ReactNode;
  isFirst?: boolean;
}) {
  return (
    <Box
      className="invoice-row"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        py: 1.5,
        borderTop: isFirst ? "none" : `1px solid ${invoiceTheme.hairline}`,
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.label, fontWeight: 600, flexShrink: 0, width: 18 }}>
          {index}
        </Typography>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: invoiceTheme.ink }}>
            {description}
          </Typography>
          {meta && (
            <Typography sx={{ fontSize: "0.78rem", color: invoiceTheme.inkMuted, mt: 0.25 }}>
              {meta}
              {rate ? ` · ${rate}` : ""}
            </Typography>
          )}
        </Box>
      </Box>
      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: invoiceTheme.ink, whiteSpace: "nowrap", flexShrink: 0 }}>
        {amount}
      </Typography>
    </Box>
  );
}

export function InvoiceLineItemsSection({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <InvoicePanelLabel>Items</InvoicePanelLabel>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );
}

// The waterfall is Subtotal -> (- Discount) -> Total -> (- Advance
// Received) -> Balance Due. discountAmount/advanceAmount/paymentMethod
// are all optional and independent of each other - with neither set
// (the common case), this renders exactly as it always did: a single
// Total row. No box/background - a plain right-aligned block with a
// single hairline above the grand total, the one rule this document
// keeps because every reader expects it.
export function InvoiceTotalCard({
  subtotal,
  discountAmount = 0,
  advanceAmount = 0,
  paymentMethod,
}: {
  subtotal: number;
  discountAmount?: number;
  advanceAmount?: number;
  paymentMethod?: string | null;
}) {
  const hasDiscount = discountAmount > 0;
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const hasAdvance = advanceAmount > 0;
  const balanceDue = Math.max(0, Math.round((total - advanceAmount) * 100) / 100);
  const isBreakdown = hasDiscount || hasAdvance;

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
      <Box sx={{ minWidth: 240 }}>
        {hasDiscount && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.inkMuted }}>Subtotal</Typography>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: invoiceTheme.ink }}>
                ₹{subtotal.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mt: 0.5 }}>
              <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.inkMuted }}>Discount</Typography>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: invoiceTheme.ink }}>
                −₹{discountAmount.toLocaleString()}
              </Typography>
            </Box>
          </>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            mt: hasDiscount ? 1 : 0,
            pt: hasDiscount ? 1 : 0,
            borderTop: hasDiscount ? `1px solid ${invoiceTheme.hairline}` : "none",
          }}
        >
          <Typography
            sx={{
              fontWeight: isBreakdown ? 600 : 700,
              fontSize: isBreakdown ? "0.85rem" : "1.05rem",
              color: invoiceTheme.ink,
            }}
          >
            Total
          </Typography>
          <Typography
            sx={{
              fontWeight: isBreakdown ? 700 : 800,
              fontSize: isBreakdown ? "0.9rem" : "1.3rem",
              color: invoiceTheme.ink,
            }}
          >
            ₹{total.toLocaleString()}
          </Typography>
        </Box>

        {hasAdvance && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mt: 0.5 }}>
              <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.inkMuted }}>
                Advance Received{paymentMethod ? ` (${paymentMethod})` : ""}
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: invoiceTheme.ink }}>
                −₹{advanceAmount.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                mt: 1,
                pt: 1,
                borderTop: `1px solid ${invoiceTheme.hairline}`,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: invoiceTheme.ink }}>
                Balance Due
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", color: invoiceTheme.ink }}>
                ₹{balanceDue.toLocaleString()}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

export function InvoiceFooter({
  children = "Thank you for your business. For questions about this invoice, please contact Zybrannox support.",
}: {
  children?: ReactNode;
}) {
  return (
    <Box
      sx={{
        mt: 4,
        pt: 2.5,
        borderTop: `1px solid ${invoiceTheme.hairline}`,
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: "0.78rem", color: invoiceTheme.inkMuted }}>
        {children}
      </Typography>
    </Box>
  );
}
