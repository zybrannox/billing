import CustomerDrawerShell, { type DrawerCustomer } from "./CustomerDrawerShell";
import CustomerQuotationsList from "./CustomerQuotationsList";

// A customer's quotations in a right-side drawer - the quotations
// counterpart to CustomerInvoicesDrawer, opened from the customer profile.
export default function CustomerQuotationsDrawer({
  customer,
  onClose,
}: {
  customer: DrawerCustomer | null;
  onClose: () => void;
}) {
  return (
    <CustomerDrawerShell customer={customer} title="QUOTATIONS" onClose={onClose}>
      {customer && <CustomerQuotationsList customerId={customer.id} />}
    </CustomerDrawerShell>
  );
}
