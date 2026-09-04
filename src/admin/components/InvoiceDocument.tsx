import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

// Shared chrome between the editable Create Invoice screen and the
// read-only printable InvoiceView - same document, two modes, so both use
// the exact same header/panel/total styling instead of two hand-tuned
// copies quietly drifting apart. Colors are the app's own blue/slate
// tokens (see index.css's --blue-*), not the black/gray of a generic
// invoice template - this is a Zybrannox document, not a stock one.
export const invoiceTheme = {
  headerBorder: "var(--blue-600, #2563eb)",
  panelBg: "var(--blue-50, #eff6ff)",
  panelBorder: "var(--blue-100, #dbeafe)",
  tableHeaderBg: "var(--blue-50, #eff6ff)",
  tableHeaderBorder: "var(--blue-600, #2563eb)",
  tableHeaderText: "#1e3a8a", // blue-900
  rowBorder: "var(--blue-100, #dbeafe)",
  totalBg: "var(--blue-50, #eff6ff)",
  totalBorder: "var(--blue-600, #2563eb)",
  totalText: "#1e3a8a",
};

const gradientTextSx = {
  background: "var(--blue-gradient)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

export function InvoiceHeader({ invoiceNumber }: { invoiceNumber?: ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        mb: 2,
        pb: 1.5,
        borderBottom: `2px solid ${invoiceTheme.headerBorder}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            bgcolor: invoiceTheme.panelBg,
            border: `1px solid ${invoiceTheme.panelBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src="/images/logo.webp"
            alt=""
            sx={{ width: 22, height: 17, objectFit: "contain" }}
          />
        </Box>
        <Box>
          <Typography sx={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2, ...gradientTextSx }}>
            Zybrannox
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
            Print &amp; Signage Solutions
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Typography sx={{ fontSize: "1.2rem", fontWeight: 800, lineHeight: 1.2, ...gradientTextSx }}>INVOICE</Typography>
        <Typography variant="caption" color="text.secondary">
          {invoiceNumber ?? "Number assigned on generate"}
        </Typography>
      </Box>
    </Box>
  );
}

export function InvoicePanelLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        letterSpacing: "0.5px",
        color: invoiceTheme.headerBorder,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Typography>
  );
}

// Wraps the Bill To / invoice-meta two-column block - the mockup's boxed
// "Invoice To / Ship To" panel, minus "Ship To" (this app has no shipping
// address concept) in favor of the invoice's own metadata instead.
export function InvoiceMetaPanel({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 3,
        mb: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: invoiceTheme.panelBg,
        border: `1px solid ${invoiceTheme.panelBorder}`,
      }}
    >
      {children}
    </Box>
  );
}

// The waterfall is Subtotal -> (- Discount) -> Total -> (- Advance
// Received) -> Balance Due. discountAmount/advanceAmount/paymentMethod
// are all optional and independent of each other - with neither set
// (the common case), this renders exactly as it always did: a single
// Total row. This stays the one place in the document that shows money,
// in both Create and the printable View.
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
  // Once anything else is shown, "Total" is a mid-waterfall line, not the
  // single headline figure - drop it down visually so whichever row is
  // actually the bottom line (Total, or Balance Due) reads as the answer.
  const isBreakdown = hasDiscount || hasAdvance;

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
      <Box
        sx={{
          minWidth: 240,
          borderRadius: 2,
          bgcolor: invoiceTheme.totalBg,
          border: `1px solid ${invoiceTheme.totalBorder}`,
          borderTop: `3px solid ${invoiceTheme.totalBorder}`,
          px: 2.25,
          py: 1.25,
        }}
      >
        {hasDiscount && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" sx={{ color: invoiceTheme.totalText }}>
                Subtotal
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: invoiceTheme.totalText }}>
                ₹{subtotal.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mt: 0.25 }}>
              <Typography variant="body2" sx={{ color: invoiceTheme.totalText }}>
                Discount
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: invoiceTheme.totalText }}>
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
            mt: hasDiscount ? 0.5 : 0,
            pt: hasDiscount ? 0.5 : 0,
            borderTop: hasDiscount ? `1px dashed ${invoiceTheme.totalBorder}` : "none",
          }}
        >
          <Typography
            sx={{
              fontWeight: isBreakdown ? 500 : 700,
              fontSize: isBreakdown ? "0.85rem" : "1rem",
              color: invoiceTheme.totalText,
            }}
          >
            Total
          </Typography>
          <Typography
            sx={{
              fontWeight: isBreakdown ? 600 : 800,
              fontSize: isBreakdown ? "0.9rem" : "1.25rem",
              color: invoiceTheme.totalText,
            }}
          >
            ₹{total.toLocaleString()}
          </Typography>
        </Box>

        {hasAdvance && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mt: 0.25 }}>
              <Typography variant="body2" sx={{ color: invoiceTheme.totalText }}>
                Advance Received{paymentMethod ? ` (${paymentMethod})` : ""}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: invoiceTheme.totalText }}>
                −₹{advanceAmount.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                mt: 0.5,
                pt: 0.5,
                borderTop: `1px dashed ${invoiceTheme.totalBorder}`,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: invoiceTheme.totalText }}>
                Balance Due
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: invoiceTheme.totalText }}>
                ₹{balanceDue.toLocaleString()}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

export function InvoiceFooter() {
  return (
    <Box
      sx={{
        mt: 2,
        pt: 1.5,
        borderTop: `1px solid ${invoiceTheme.panelBorder}`,
        textAlign: "center",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Thank you for your business. For questions about this invoice, please contact Zybrannox support.
      </Typography>
    </Box>
  );
}
