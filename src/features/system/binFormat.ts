const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left, counting a part-day as a day, so "1" means it's still there
// for up to a day and never rounds down to nothing while it can be restored.
export const daysLeft = (expiresAt: string, now: Date = new Date()) =>
  Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS));

export const daysLeftLabel = (days: number) =>
  days <= 0 ? "Deleted today" : days === 1 ? "1 day left" : `${days} days left`;

export const daysLeftTone = (days: number) =>
  days <= 1
    ? { fg: "var(--red-700)", bg: "var(--red-50)" }
    : days <= 3
      ? { fg: "var(--amber-800)", bg: "var(--amber-100)" }
      : { fg: "var(--slate-600)", bg: "var(--slate-100)" };

export const BIN_TYPE_LABELS: Record<string, { one: string; many: string }> = {
  project: { one: "Project", many: "Projects" },
  file: { one: "File", many: "Files" },
  note: { one: "Note", many: "Notes" },
  invoice: { one: "Invoice", many: "Invoices" },
  quotation: { one: "Quotation", many: "Quotations" },
  customer: { one: "Customer", many: "Customers" },
  company: { one: "Company", many: "Companies" },
  employee: { one: "Employee", many: "Employees" },
};
