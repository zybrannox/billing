import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { invoiceStatusInfo, type InvoiceStatusInput } from "./invoiceStatus";

// An invoice's status in words, like "Overdue by 3 days", wherever one is listed.
export default function InvoiceStatusChip({ invoice }: { invoice: InvoiceStatusInput }) {
  const status = invoiceStatusInfo(invoice);
  return <Chip label={status.label} sx={semanticChipSx(status.color)} />;
}
