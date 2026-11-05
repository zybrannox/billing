// What an invoice's status means right now, in words: not just "pending", but
// how late it is or when it falls due.
export interface InvoiceStatusInput {
  status: string;
  due_date?: string | null;
  advance_amount?: number | null;
}

export interface InvoiceStatusInfo {
  label: string;
  color: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole calendar days from `from` to `to`, on the viewer's own calendar.
const calendarDaysBetween = (from: Date, to: Date) => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
};

const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);

export function invoiceStatusInfo(invoice: InvoiceStatusInput, now: Date = new Date()): InvoiceStatusInfo {
  if (invoice.status === "paid") return { label: "Paid", color: "var(--green-600)" };
  if (invoice.status === "cancelled") return { label: "Cancelled", color: "var(--slate-500)" };

  const due = invoice.due_date ? new Date(invoice.due_date) : null;
  if (due && due.getTime() < now.getTime()) {
    const late = calendarDaysBetween(due, now);
    return { label: late > 0 ? `Overdue by ${days(late)}` : "Overdue", color: "var(--red-600)" };
  }
  if ((invoice.advance_amount ?? 0) > 0) return { label: "Partially paid", color: "var(--amber-600)" };
  if (due) {
    const left = calendarDaysBetween(now, due);
    return { label: left === 0 ? "Due today" : `Due in ${days(left)}`, color: "var(--blue-600)" };
  }
  return { label: "Unpaid", color: "var(--blue-600)" };
}
