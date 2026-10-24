import { forwardRef, useMemo } from "react";

import DocumentSheet from "../documents/DocumentSheet";
import { quotationToDocument } from "./documentAdapters";
import { useDocumentSettings } from "../documents/useDocumentSettingsStore";
import { QUOTATION_STATUS_LABELS, type QuotationDetail } from "./quotationSheetUtils";

// The printable quotation document - the counterpart of InvoiceSheet.tsx,
// split out for the same reason: it's rendered visibly in the quotation view
// and invisibly (off-screen) by downloadDocument.ts for a download
// straight from a card, and both need the exact same document. The status
// is printed on it once the quotation is past "pending".
const QuotationSheet = forwardRef<HTMLDivElement, { quotation: QuotationDetail }>(
  function QuotationSheet({ quotation }, ref) {
    const { settings, logoUrl } = useDocumentSettings();
    const data = useMemo(
      () =>
        quotationToDocument(
          quotation,
          settings,
          quotation.status === "pending" ? undefined : QUOTATION_STATUS_LABELS[quotation.status],
        ),
      [quotation, settings],
    );
    return <DocumentSheet ref={ref} data={data} settings={settings} logoUrl={logoUrl} />;
  },
);

export default QuotationSheet;
