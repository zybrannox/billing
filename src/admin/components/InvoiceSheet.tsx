import { forwardRef } from "react";
import { Box, Typography, Paper } from "@mui/material";

import { formatDate } from "../../utils/dateFormatter";
import {
  InvoiceHeader,
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceLineItemsSection,
  InvoiceLineItem,
  InvoiceTotalCard,
  InvoiceFooter,
  invoiceTheme,
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
    const projectLine = [invoice.project?.project_type, invoice.project?.delivery_date ? `Delivery ${formatDate(invoice.project.delivery_date)}` : null]
      .filter(Boolean)
      .join(" · ");

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
          p: { xs: 3, sm: 5 },
        }}
      >
        <InvoiceHeader invoiceNumber={invoice.invoice_number} />

        {/* Bill To & Metadata */}
        <InvoiceMetaPanel>
          <Box>
            <InvoicePanelLabel>Billed To</InvoicePanelLabel>
            <Typography sx={{ fontWeight: 700, color: invoiceTheme.ink, fontSize: "1rem", mt: 0.5 }}>
              {customerName}
            </Typography>
            {invoice.customer && (
              <Box sx={{ mt: 0.5 }}>
                <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.inkMuted }}>
                  {invoice.customer.email}
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.inkMuted }}>
                  {invoice.customer.contact_number}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ textAlign: { xs: "left", sm: "right" }, mt: { xs: 2, sm: 0 } }}>
            <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" }, gap: 1 }}>
              <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.inkMuted }}>Invoice Date</Typography>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: invoiceTheme.ink }}>
                {formatDate(invoice.created_at)}
              </Typography>
            </Box>
            {invoice.due_date && (
              <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" }, gap: 1, mt: 0.4 }}>
                <Typography sx={{ fontSize: "0.85rem", color: invoiceTheme.inkMuted }}>Due Date</Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: invoiceTheme.ink }}>
                  {formatDate(invoice.due_date)}
                </Typography>
              </Box>
            )}
            {projectLine && (
              <Typography sx={{ fontSize: "0.8rem", color: invoiceTheme.inkMuted, mt: 0.8 }}>
                {projectLine}
              </Typography>
            )}
          </Box>
        </InvoiceMetaPanel>

        {/* Line Items */}
        <InvoiceLineItemsSection>
          {invoice.items.map((item, idx) => (
            <InvoiceLineItem
              key={item.id}
              index={idx + 1}
              isFirst={idx === 0}
              description={item.description || "Standard Item"}
              meta={`${formatDimension(item.width, item.unit)} × ${formatDimension(item.height, item.unit)} (${item.sq_ft} sq ft) · Qty ${item.pieces}`}
              rate={item.is_manual_total ? undefined : `₹${item.rate.toLocaleString("en-IN")}/sq ft`}
              amount={formatCurrency(item.total)}
            />
          ))}
        </InvoiceLineItemsSection>

        {/* Calculation Summary */}
        <InvoiceTotalCard
          subtotal={invoice.subtotal}
          discountAmount={invoice.discount_amount}
          advanceAmount={invoice.advance_amount}
          paymentMethod={invoice.payment_method}
        />

        {invoice.payment_reference && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Typography sx={{ fontSize: "0.78rem", color: invoiceTheme.inkMuted }}>
              Payment Ref: <Box component="span" sx={{ fontWeight: 700, color: invoiceTheme.ink }}>{invoice.payment_reference}</Box>
            </Typography>
          </Box>
        )}

        <InvoiceFooter />
      </Paper>
    );
  },
);

export default InvoiceSheet;
