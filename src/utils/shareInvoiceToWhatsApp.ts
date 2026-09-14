import { createRoot } from "react-dom/client";
import { createElement } from "react";

import { apiService } from "../api/service";
import { generateInvoicePdf } from "./generateInvoicePdf";
import { shareToWhatsAppAfter } from "./shareToWhatsApp";
import InvoiceSheet from "../admin/components/InvoiceSheet";
import { formatCurrency, type InvoiceDetail } from "../admin/components/invoiceSheetUtils";

// Shares an invoice straight to WhatsApp from a list row (see
// admin/components/CustomerInvoicesList.tsx's Share action) without ever
// visibly opening the invoice itself - admin/pages/InvoiceView.tsx's own
// WhatsApp share needs a real, on-screen .invoice-sheet node to rasterize
// (see its buildPdfFile), so this renders the exact same InvoiceSheet
// (see admin/components/InvoiceSheet.tsx) into a detached container
// positioned off-screen instead - present in the DOM and actually
// painted, just not visible to the user - captures it, then tears it
// down. A user clicking "Share" on a row shouldn't see the full document
// flash open first.
export async function shareInvoiceToWhatsApp(invoiceId: number) {
  await shareToWhatsAppAfter(async () => {
    const invoice = await apiService.get<InvoiceDetail>(`/invoices/${invoiceId}/details`);

    const container = document.createElement("div");
    // Off-screen, not display:none/visibility:hidden - html2canvas needs
    // the node actually laid out and painted to rasterize it. Fixed width
    // matches the on-screen sheet's own natural width (see InvoiceView.tsx).
    Object.assign(container.style, {
      position: "fixed",
      top: "0",
      left: "-10000px",
      width: "840px",
      pointerEvents: "none",
    });
    document.body.appendChild(container);

    const root = createRoot(container);
    let node: HTMLDivElement | null = null;

    try {
      await new Promise<void>((resolve) => {
        root.render(
          createElement(InvoiceSheet, {
            invoice,
            ref: (el: HTMLDivElement | null) => {
              node = el;
              if (el) resolve();
            },
          }),
        );
      });
      // One extra frame so images/fonts inside the just-mounted sheet have
      // actually painted before html2canvas captures it, not just laid out.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      if (!node) throw new Error("Failed to render the invoice for sharing");
      const file = await generateInvoicePdf(node, `Invoice-${invoice.invoice_number}.pdf`);

      const formData = new FormData();
      formData.append("file", file, file.name);
      const { url } = await apiService.post<{ url: string }>(
        `/invoices/${invoiceId}/share-link`,
        formData,
      );
      return `Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.amount)}\n${url}`;
    } finally {
      root.unmount();
      container.remove();
    }
  });
}
