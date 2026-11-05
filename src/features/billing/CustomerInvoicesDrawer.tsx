import CustomerDrawerShell, { type DrawerCustomer } from "./CustomerDrawerShell";
import CustomerInvoicesList from "./CustomerInvoicesList";

export type { DrawerCustomer };

// A customer's invoices in a right-side drawer - shared by the Customers
// list (click a row) and the customer profile's Billing button, so both show
// the same cards with the same actions. `onClose` is where a caller
// refreshes anything an in-drawer action (payment, mark paid, cancel) may
// have changed.
export default function CustomerInvoicesDrawer({
  customer,
  onClose,
  onChanged,
  showCustomerLink = true,
}: {
  customer: DrawerCustomer | null;
  onClose: () => void;
  // A payment or cancel inside the drawer changes what the screen behind shows.
  onChanged?: () => void;
  // The "View Customer" link goes to the customer's profile page -
  // pointless to offer from the profile itself.
  showCustomerLink?: boolean;
}) {
  return (
    <CustomerDrawerShell customer={customer} title="Invoices" onClose={onClose}>
      {customer && <CustomerInvoicesList key={customer.id} customerId={customer.id} showCustomerLink={showCustomerLink} onChanged={onChanged} />}
    </CustomerDrawerShell>
  );
}
