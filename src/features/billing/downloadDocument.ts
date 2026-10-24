import { createElement } from "react";
import { saveAs } from "file-saver";

import { apiService } from "../../api/service";
import { renderDocumentPdf } from "../documents/renderDocumentPdf";
import { useDocumentSettingsStore } from "../documents/useDocumentSettingsStore";
import InvoiceSheet from "./InvoiceSheet";
import QuotationSheet from "./QuotationSheet";
import type { InvoiceDetail } from "./invoiceSheetUtils";
import type { QuotationDetail } from "./quotationSheetUtils";

// "Download PDF" straight from a list card: fetch the document, render it
// off-screen (see renderDocumentPdf) and save the result - the document
// itself is never opened.
export async function downloadInvoicePdf(invoiceId: number) {
  const [invoice] = await Promise.all([
    apiService.get<InvoiceDetail>(`/invoices/${invoiceId}/details`),
    useDocumentSettingsStore.getState().load(),
  ]);
  const file = await renderDocumentPdf(
    (ref) => createElement(InvoiceSheet, { invoice, ref }),
    `Invoice-${invoice.invoice_number}.pdf`,
  );
  saveAs(file, file.name);
}

export async function downloadQuotationPdf(quotationId: number) {
  const [quotation] = await Promise.all([
    apiService.get<QuotationDetail>(`/quotations/${quotationId}/details`),
    useDocumentSettingsStore.getState().load(),
  ]);
  const file = await renderDocumentPdf(
    (ref) => createElement(QuotationSheet, { quotation, ref }),
    `Quotation-${quotation.quotation_number}.pdf`,
  );
  saveAs(file, file.name);
}
