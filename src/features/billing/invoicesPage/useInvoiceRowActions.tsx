import { useState } from "react";
import type { GridRowParams } from "@mui/x-data-grid";
import { useConfirmDialogStore } from "../../../hooks/useconfirmDialogStore";
import CrudActions from "../../../ui/Actions";
import { downloadInvoicePdf } from "../downloadDocument";
import ProjectFilesButton from "../ProjectFilesButton";
import { shareInvoiceToWhatsApp } from "../shareInvoiceToWhatsApp";

// A table row's quick actions: download the PDF, share to WhatsApp, and see the
// files it billed for, without opening the invoice.
export function useInvoiceRowActions() {
  const { showDialog } = useConfirmDialogStore();
  const [busyId, setBusyId] = useState<number | null>(null);

  const download = async (invoiceId: number) => {
    setBusyId(invoiceId);
    try {
      await downloadInvoicePdf(invoiceId);
    } catch (err) {
      console.error("Failed to download invoice", err);
      showDialog({ title: "Couldn't download invoice", description: "Something went wrong preparing the PDF. Please try again.", confirmText: "OK" });
    } finally {
      setBusyId(null);
    }
  };

  const share = (invoiceId: number) =>
    shareInvoiceToWhatsApp(invoiceId).catch((err) => {
      console.error("Failed to share invoice to WhatsApp", err);
      showDialog({ title: "Couldn't share invoice", description: "Something went wrong preparing the WhatsApp share link. Please try again.", confirmText: "OK" });
    });

  return (params: GridRowParams) => {
    const id = Number(params.id);
    return [
      <CrudActions key="invoice" downloadDocument onDownloadDocument={() => download(id)} documentBusy={busyId === id} shareInvoice onShareInvoice={() => share(id)} size="small" />,
      <ProjectFilesButton key="files" invoiceId={id} invoiceNumber={params.row.invoice_number} />,
    ];
  };
}
