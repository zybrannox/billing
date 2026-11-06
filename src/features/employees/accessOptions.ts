import type { Permission } from "../../store/useAppStore";

export const ACCESS_OPTIONS: { permission: Permission; label: string; description: string }[] = [
  {
    permission: "invoice.edit",
    label: "Edit project invoices",
    description: "Correct the lines, discount and due date of an unpaid invoice from its project. Cancelling stays with admins.",
  },
  {
    permission: "workspace.manage",
    label: "Workspace settings",
    description: "Change the dropdown options and invoice design in System setup.",
  },
  {
    permission: "notes.access",
    label: "Notes",
    description: "See, add, tick off and delete everyone's job notes.",
  },
];

// Short wording for a table cell or panel header: "None", "2 of 3" or "Full access".
export const accessSummary = (permissions: string[] = []) => {
  const on = ACCESS_OPTIONS.filter((o) => permissions.includes(o.permission)).length;
  if (on === 0) return "None";
  return on === ACCESS_OPTIONS.length ? "Full access" : `${on} of ${ACCESS_OPTIONS.length}`;
};

// The names behind that summary, for a tooltip.
export const accessNames = (permissions: string[] = []) =>
  ACCESS_OPTIONS.filter((o) => permissions.includes(o.permission))
    .map((o) => o.label)
    .join(", ");
