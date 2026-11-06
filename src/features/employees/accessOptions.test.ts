import { describe, expect, it } from "vitest";
import { accessNames, accessSummary } from "./accessOptions";

describe("accessSummary", () => {
  it("says None when nothing is switched on", () => {
    expect(accessSummary([])).toBe("None");
    expect(accessSummary(undefined)).toBe("None");
  });

  it("counts a partial grant", () => {
    expect(accessSummary(["invoice.edit", "notes.access"])).toBe("2 of 3");
  });

  it("says Full access when everything is on", () => {
    expect(accessSummary(["invoice.edit", "workspace.manage", "notes.access"])).toBe("Full access");
  });

  it("ignores permissions it doesn't know", () => {
    expect(accessSummary(["something.old"])).toBe("None");
  });
});

describe("accessNames", () => {
  it("names what is switched on, in the panel's order", () => {
    expect(accessNames(["workspace.manage", "invoice.edit"])).toBe("Edit project invoices, Workspace settings");
  });
});
