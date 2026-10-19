import { forwardRef, useMemo } from "react";

import DocumentSheet from "../../documents/DocumentSheet";
import { invoiceToDocument } from "../../documents/documentAdapters";
import { useDocumentSettings } from "../../store/useDocumentSettingsStore";
import type { InvoiceDetail } from "./invoiceSheetUtils";

// The printable invoice document itself - split out from
// admin/pages/InvoiceView.tsx so it can be rendered two ways: visibly,
// inside that page's dialog, or invisibly (off-screen, briefly, just long
// enough for html2canvas to rasterize it - see utils/shareInvoiceToWhatsApp.ts)
// for a "share to WhatsApp" action triggered straight from a list row
// (admin/components/CustomerInvoicesList.tsx) that shouldn't visibly open
// anything first. Both callers need the exact same rendered document -
// generating a PDF that looks different depending on which route shared
// it would be a real bug, not just a cosmetic one.
//
// The layout itself is the shared DocumentSheet (branding, theme and wording
// come from the admin's Document Design settings); this only adapts an
// invoice to it.
const InvoiceSheet = forwardRef<HTMLDivElement, { invoice: InvoiceDetail }>(
  function InvoiceSheet({ invoice }, ref) {
    const { settings, logoUrl } = useDocumentSettings();
    const data = useMemo(() => invoiceToDocument(invoice, settings), [invoice, settings]);
    return <DocumentSheet ref={ref} data={data} settings={settings} logoUrl={logoUrl} />;
  },
);

export default InvoiceSheet;
