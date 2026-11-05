import { describe, expect, it } from "vitest";
import { actionLabel, actorLabel, changesOf, formatChangeValue, summaryOf, viewOfChange } from "./auditFormat";

describe("actionLabel", () => {
  it.each([
    ["project.update", "Project edited"],
    ["customer.create", "Customer added"],
    ["user.delete", "Employee deleted"],
    ["file.delete", "File deleted"],
    ["bin.expire", "Removed after 14 days"],
    ["invoice.payment", "Payment recorded"],
  ])("%s reads as %s", (action, label) => {
    expect(actionLabel(action)).toBe(label);
  });

  it("falls back to the raw action for anything unknown", () => {
    expect(actionLabel("something.new")).toBe("something.new");
  });
});

describe("actorLabel", () => {
  it("names who did it", () => {
    expect(actorLabel("asha")).toBe("asha");
    expect(actorLabel("system")).toBe("System (automatic)");
    expect(actorLabel("client:ravi@example.com")).toBe("ravi@example.com (client)");
  });
});

describe("viewOfChange", () => {
  it("shows what changed to what", () => {
    expect(viewOfChange({ field: "print_status", label: "Print status", from: "Pending", to: "In Progress" })).toEqual({
      kind: "changed",
      label: "Print status",
      from: "Pending",
      to: "In Progress",
    });
  });

  it("makes an empty before or after visible", () => {
    expect(viewOfChange({ field: "description", label: "Description", from: null, to: "Shop front" })).toMatchObject({ from: "(empty)", to: "Shop front" });
    expect(viewOfChange({ field: "description", label: "Description", from: "Old", to: null })).toMatchObject({ from: "Old", to: "(empty)" });
  });

  it("shows a new record's value with no before", () => {
    expect(viewOfChange({ field: "description", label: "Description", from: null, to: "Shop front" }, true)).toEqual({
      kind: "value",
      label: "Description",
      value: "Shop front",
    });
  });

  it("formats values on both sides", () => {
    expect(viewOfChange({ field: "pinned", label: "Pinned", from: false, to: true })).toMatchObject({ from: "No", to: "Yes" });
  });

  it("never shows a secret", () => {
    expect(viewOfChange({ field: "hashed_password", label: "Password", hidden: true })).toEqual({ kind: "note", text: "Password changed" });
  });

  it("doesn't invent a before for an entry that never recorded one", () => {
    expect(viewOfChange({ field: "status", label: "Status", to: "cancelled" })).toEqual({ kind: "value", label: "Status", value: "Cancelled" });
  });
});

describe("formatChangeValue", () => {
  it("formats by what the value is", () => {
    expect(formatChangeValue("pinned", true)).toBe("Yes");
    expect(formatChangeValue("is_active", false)).toBe("No");
    expect(formatChangeValue("payment_terms_days", 30)).toBe("30");
    expect(formatChangeValue("amount", 1600)).toContain("1,600");
    expect(formatChangeValue("x", "")).toBe("—");
  });

  it("capitalises statuses", () => {
    expect(formatChangeValue("status", "pending")).toBe("Pending");
  });

  it("makes dates readable", () => {
    expect(formatChangeValue("delivery_date", "2026-11-05T07:30:00Z")).not.toContain("T07");
  });

  it("leaves text that merely starts with numbers alone", () => {
    expect(formatChangeValue("description", "2026 banner")).toBe("2026 banner");
  });
});

describe("older entries", () => {
  it("shows what an older entry recorded, without a made-up before", () => {
    expect(changesOf({ changes: { payment_method: "UPI" } })).toEqual([{ field: "payment_method", label: "Payment method", to: "UPI" }]);
  });

  it("still names what an old bulk delete removed", () => {
    expect(summaryOf({ ids: [4, 7] })).toBe("#4, #7");
  });
});
