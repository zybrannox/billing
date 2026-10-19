import { createElement } from "react";

import { apiService } from "../api/service";
import { renderDocumentPdf } from "./renderDocumentPdf";
import { shareToWhatsAppAfter } from "./shareToWhatsApp";
import { useDocumentSettingsStore } from "../store/useDocumentSettingsStore";
import InvoiceSheet from "../admin/components/InvoiceSheet";
import { formatCurrency, type InvoiceDetail } from "../admin/components/invoiceSheetUtils";

// Shares an invoice straight to WhatsApp from a list row (see
// admin/components/CustomerInvoicesList.tsx's Share action) without ever
// visibly opening the invoice itself - the same InvoiceSheet is rendered
// off-screen and captured (see renderDocumentPdf), so a user clicking
// "Share" on a row never sees the full document flash open first.
export async function shareInvoiceToWhatsApp(invoiceId: number) {
  await shareToWhatsAppAfter(async () => {
    // The branding load (settings + logo) overlaps the invoice fetch.
    const [invoice] = await Promise.all([
      apiService.get<InvoiceDetail>(`/invoices/${invoiceId}/details`),
      useDocumentSettingsStore.getState().load(),
    ]);
    const file = await renderDocumentPdf(
      (ref) => createElement(InvoiceSheet, { invoice, ref }),
      `Invoice-${invoice.invoice_number}.pdf`,
    );

    const formData = new FormData();
    formData.append("file", file, file.name);
    const { url } = await apiService.post<{ url: string }>(`/invoices/${invoiceId}/share-link`, formData);
    return `Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.amount)}\n${url}`;
  });
}
