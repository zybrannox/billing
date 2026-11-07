// Query keys for a customer's payments, shared by the dialog and the tab.
export const paymentKeys = {
  list: (customerId: number) => ["customer-payments", customerId] as const,
  open: (customerId: number) => ["customer-open-invoices", customerId] as const,
};
