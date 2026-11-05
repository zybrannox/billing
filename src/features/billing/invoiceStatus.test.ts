import { describe, expect, it } from "vitest";
import { invoiceStatusInfo } from "./invoiceStatus";

const now = new Date(2026, 10, 5, 14, 0);
const at = (day: number, hour = 12) => new Date(2026, 10, day, hour, 0).toISOString();
const label = (input: Parameters<typeof invoiceStatusInfo>[0]) => invoiceStatusInfo(input, now).label;

describe("invoiceStatusInfo", () => {
  it("says a settled invoice is settled, whatever its due date", () => {
    expect(label({ status: "paid", due_date: at(1) })).toBe("Paid");
    expect(label({ status: "cancelled", due_date: at(1) })).toBe("Cancelled");
  });

  it("counts how late an unpaid invoice is, in calendar days", () => {
    expect(label({ status: "pending", due_date: at(2) })).toBe("Overdue by 3 days");
    expect(label({ status: "pending", due_date: at(4, 23) })).toBe("Overdue by 1 day");
  });

  it("calls it overdue the moment the due time passes today", () => {
    expect(label({ status: "pending", due_date: at(5, 9) })).toBe("Overdue");
  });

  it("puts lateness ahead of a part payment", () => {
    expect(label({ status: "pending", due_date: at(2), advance_amount: 50 })).toBe("Overdue by 3 days");
    expect(label({ status: "pending", due_date: at(9), advance_amount: 50 })).toBe("Partially paid");
  });

  it("says when an upcoming invoice falls due", () => {
    expect(label({ status: "pending", due_date: at(5, 18) })).toBe("Due today");
    expect(label({ status: "pending", due_date: at(6) })).toBe("Due in 1 day");
    expect(label({ status: "pending", due_date: at(12) })).toBe("Due in 7 days");
  });

  it("is plainly unpaid with no due date", () => {
    expect(label({ status: "pending", due_date: null })).toBe("Unpaid");
  });
});
