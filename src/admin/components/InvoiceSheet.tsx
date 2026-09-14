import { forwardRef } from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";

import { formatDate } from "../../utils/dateFormatter";
import {
  InvoiceHeader,
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
  InvoiceFooter,
} from "./InvoiceDocument";
import { formatCurrency, formatDimension, type InvoiceDetail } from "./invoiceSheetUtils";

// The printable invoice document itself - split out from
// admin/pages/InvoiceView.tsx so it can be rendered two ways: visibly,
// inside that page's dialog, or invisibly (off-screen, briefly, just long
// enough for html2canvas to rasterize it - see utils/shareInvoiceToWhatsApp.ts)
// for a "share to WhatsApp" action triggered straight from a list row
// (admin/components/CustomerInvoicesList.tsx) that shouldn't visibly open
// anything first. Both callers need the exact same rendered document -
// generating a PDF that looks different depending on which route shared
// it would be a real bug, not just a cosmetic one.
const InvoiceSheet = forwardRef<HTMLDivElement, { invoice: InvoiceDetail }>(
  function InvoiceSheet({ invoice }, ref) {
    const customerName = invoice.customer
      ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
      : "—";

    return (
      <Paper
        ref={ref}
        className="invoice-sheet"
        elevation={0}
        sx={{
          bgcolor: "var(--white)",
          borderRadius: 3,
          border: "1px solid var(--slate-200)",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05)",
          p: { xs: 2.5, sm: 3.5 },
        }}
      >
        <InvoiceHeader invoiceNumber={invoice.invoice_number} />

        {/* Bill To & Metadata Section */}
        <InvoiceMetaPanel>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", height: "fit-content" }}>
              <PersonRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <InvoicePanelLabel>Billed To</InvoicePanelLabel>
              <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "1.05rem", mt: 0.2 }}>
                {customerName}
              </Typography>
              {invoice.customer && (
                <Stack spacing={0.2} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                    {invoice.customer.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                    {invoice.customer.contact_number}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: { xs: "left", sm: "right" }, mt: { xs: 2, sm: 0 } }}>
            <Stack spacing={0.5} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
              <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Invoice Date:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }}>
                  {formatDate(invoice.created_at)}
                </Typography>
              </Box>
              {invoice.due_date && (
                <Box sx={{ display: "flex", justifyContent: { sm: "flex-end" }, gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }}>
                    {formatDate(invoice.due_date)}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </InvoiceMetaPanel>

        {/* Project Context Box */}
        {(invoice.project?.delivery_date || invoice.project?.project_type) && (
          <Box
            sx={{
              mb: 1.5,
              p: 1.25,
              borderRadius: 2,
              bgcolor: "var(--slate-50)",
              border: "1px solid var(--slate-200)",
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
            }}
          >
            <FolderOpenRoundedIcon sx={{ color: "var(--slate-500)", mt: 0.2 }} fontSize="small" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }}>
                {invoice.project?.project_type ?? "Custom Work"} Order
              </Typography>
            </Box>
            {invoice.project?.delivery_date && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "var(--white)", px: 1.5, py: 0.5, borderRadius: 1.5, border: "1px solid var(--slate-200)" }}>
                <EventRoundedIcon sx={{ fontSize: "0.85rem", color: "var(--slate-500)" }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--slate-600)" }}>
                  Delivery: {formatDate(invoice.project.delivery_date)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Items Breakdown Table */}
        <Box
          sx={{
            border: "1px solid var(--slate-200)",
            borderRadius: 2.5,
            overflow: "hidden",
            mb: 1.5,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "28px 2.2fr 1.1fr 0.6fr 1fr 1.2fr",
              bgcolor: "var(--slate-50)",
              borderBottom: "1px solid var(--slate-200)",
              px: 2,
              py: 0.75,
              gap: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              #
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Item Description
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Size / Area
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right", color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pieces
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Rate (₹)
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right", color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Amount
            </Typography>
          </Box>

          {/* Rows */}
          {invoice.items.map((item, idx) => (
            <Box
              key={item.id}
              className="invoice-row"
              sx={{
                display: "grid",
                gridTemplateColumns: "28px 2.2fr 1.1fr 0.6fr 1fr 1.2fr",
                px: 2,
                py: 0.9,
                gap: 1.5,
                alignItems: "center",
                borderTop: idx === 0 ? "none" : "1px solid var(--slate-100)",
                bgcolor: idx % 2 === 0 ? "var(--white)" : "var(--slate-50)",
              }}
            >
              <Typography variant="body2" sx={{ color: "var(--slate-400)", fontWeight: 600 }}>
                {idx + 1}
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-800)" }}>
                {item.description || "Standard Item"}
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--slate-700)" }}>
                {formatDimension(item.width, item.unit)} × {formatDimension(item.height, item.unit)} ({item.sq_ft} sq ft)
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--slate-700)", textAlign: "right" }}>
                {item.pieces}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {item.is_manual_total ? "—" : `₹${item.rate.toLocaleString("en-IN")}`}
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right", color: "var(--slate-900)", whiteSpace: "nowrap" }}>
                {formatCurrency(item.total)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calculation Summary Card */}
        <InvoiceTotalCard
          subtotal={invoice.subtotal}
          discountAmount={invoice.discount_amount}
          advanceAmount={invoice.advance_amount}
          paymentMethod={invoice.payment_method}
        />

        {/* Reference details */}
        {invoice.payment_reference && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ bgcolor: "var(--slate-100)", px: 1.5, py: 0.5, borderRadius: 1 }}>
              Payment Ref: <strong>{invoice.payment_reference}</strong>
            </Typography>
          </Box>
        )}

        <InvoiceFooter />
      </Paper>
    );
  },
);

export default InvoiceSheet;
