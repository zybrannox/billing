import { useState } from "react";
import { apiService } from "../../api/service";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { messages } from "../../messages";
import type { RecordPaymentTarget } from "./RecordPaymentDialog";
import { useInvoiceStore } from "./useInvoiceStore";

// Marking an invoice paid, recording a payment and cancelling, shared by every
// screen that offers them. Render <RecordPaymentDialog invoice={paymentTarget} />
// alongside, and refresh whatever the change affects in `onChanged`.
export function useInvoiceActions(onChanged: () => void) {
  const { showDialog } = useConfirmDialogStore();
  const { updateInvoice } = useInvoiceStore();
  const [paymentTarget, setPaymentTarget] = useState<RecordPaymentTarget | null>(null);

  // Goes through the dedicated PATCH /invoices/{id}/mark-paid endpoint (see
  // app/invoices/service.py's service_mark_paid), never the generic
  // updateInvoice({status: "paid"}), which never touches advance_amount and
  // would leave a stale nonzero balance_due on an invoice every aggregate has
  // already stopped counting as outstanding.
  const markPaid = (invoiceId: number) => {
    showDialog({
      title: "Mark Invoice as Paid",
      description: "This records the invoice as paid in full. How was it paid?",
      confirmText: messages.actions.invoice.markPaid,
      paymentMethodRequired: true,
      onConfirm: async (paymentMethod) => {
        await apiService.patch(`/invoices/${invoiceId}/mark-paid`, {
          payment_method: paymentMethod,
        });
        onChanged();
      },
    });
  };

  // Cancelling is final (an invoice can't leave "cancelled"), so it's confirmed
  // first. A failure shows inside the dialog (see useConfirmDialogStore) and
  // leaves it open to retry.
  const cancel = (invoiceId: number, invoiceNumber: string) => {
    showDialog({
      title: "Cancel this invoice?",
      description: `${invoiceNumber} will be marked as cancelled. This can't be undone.`,
      confirmText: messages.actions.invoice.cancel,
      cancelText: "Keep Invoice",
      isDestructive: true,
      onConfirm: async () => {
        await updateInvoice(invoiceId, { status: "cancelled" });
        onChanged();
      },
    });
  };

  return { markPaid, cancel, paymentTarget, setPaymentTarget };
}
