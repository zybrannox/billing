import { formatDateTime } from "../../format/date";
import { formatRupees } from "../../format/money";

export interface AuditChange {
  field: string;
  label: string;
  from?: unknown;
  to?: unknown;
  // The value is a secret: only say that it changed.
  hidden?: boolean;
}

const ENTITY_NAMES: Record<string, string> = {
  project: "Project",
  file: "File",
  invoice: "Invoice",
  quotation: "Quotation",
  customer: "Customer",
  company: "Company",
  user: "Employee",
  list_option: "Dropdown option",
  document_settings: "Invoice design",
  job_request: "Job request",
  client_account: "Client login",
  share_link: "Share link",
  note: "Note",
};

const VERBS: Record<string, string> = { create: "added", update: "edited", delete: "deleted" };

// Actions that aren't simply "<thing> added/edited/deleted".
const ACTION_LABELS: Record<string, string> = {
  "invoice.payment": "Payment recorded",
  "invoice.mark_paid": "Marked paid",
  "invoice.cancel": "Invoice cancelled",
  "invoice.status": "Invoice status changed",
  "quotation.accepted": "Quotation accepted",
  "quotation.rejected": "Quotation rejected",
  // Only on older entries; bulk deletes now get one entry per project.
  "project.bulk_delete": "Projects deleted",
  "user.revoke_sessions": "Signed out everywhere",
  "auth.lockout": "Account locked (failed sign-ins)",
  "bin.restore": "Restored from bin",
  "bin.erase": "Deleted forever",
  "bin.empty": "Bin emptied",
  "bin.expire": "Removed after 14 days",
  "backup.run": "Backup taken",
  "share_link.create": "Share link created",
  "share_link.delete": "Share link revoked",
};

// Anything unknown still reads sensibly rather than as a raw code.
export const actionLabel = (action: string) => {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const [entity, verb] = action.split(".");
  const name = ENTITY_NAMES[entity];
  return name && VERBS[verb] ? `${name} ${VERBS[verb]}` : action;
};

// Money in is green, anything removed is red, the rest is neutral blue - so a
// scan down the Action column shows what kind of event each row is.
export const actionTone = (action: string) =>
  action.endsWith("delete") ||
  action.includes("cancel") ||
  action.includes("lockout") ||
  action.includes("reject") ||
  action === "bin.erase" ||
  action === "bin.empty" ||
  action === "bin.expire"
    ? { fg: "var(--red-700)", bg: "var(--red-50)" }
    : action.includes("payment") || action.includes("paid") || action.includes("accepted") || action === "bin.restore"
      ? { fg: "var(--emerald-700)", bg: "var(--emerald-50)" }
      : action.endsWith("create")
        ? { fg: "var(--violet-600)", bg: "var(--violet-50)" }
        : { fg: "var(--blue-700)", bg: "var(--blue-50)" };

export const actorLabel = (actor: string) =>
  actor === "system" ? "System (automatic)" : actor.startsWith("client:") ? `${actor.slice(7)} (client)` : actor;

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const MONEY_FIELDS = new Set(["amount", "subtotal", "discount_amount", "advance_amount", "rate", "credit_limit"]);

export const formatChangeValue = (field: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return MONEY_FIELDS.has(field) ? formatRupees(value) : String(value);
  if (typeof value === "string" && ISO_DATE_TIME.test(value)) return formatDateTime(value);
  // Stored in lowercase ("pending"), shown everywhere else in the app capitalised.
  if (field === "status" && typeof value === "string") return value.charAt(0).toUpperCase() + value.slice(1);
  return String(value);
};

export type ChangeView =
  | { kind: "changed"; label: string; from: string; to: string }
  // A new record's value, or an old entry that only recorded the new value.
  | { kind: "value"; label: string; value: string }
  | { kind: "note"; text: string };

// What was changed to what. A value going from empty to something is still a
// change on an existing record ("(empty) → Shop front"), but on a new record
// there was no "before" at all, so it's just the value it was created with.
export const viewOfChange = (change: AuditChange, isNew = false): ChangeView => {
  if (change.hidden) return { kind: "note", text: `${change.label} changed` };
  const to = formatChangeValue(change.field, change.to);
  if (isNew || !("from" in change)) return { kind: "value", label: change.label, value: to };
  const isEmpty = change.from === null || change.from === undefined || change.from === "";
  return {
    kind: "changed",
    label: change.label,
    from: isEmpty ? "(empty)" : formatChangeValue(change.field, change.from),
    to: change.to === null || change.to === undefined || change.to === "" ? "(empty)" : to,
  };
};

const prettyField = (field: string) => {
  const words = field.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Entries from before changes were tracked in detail stored only the new values,
// as a plain object; those show what they have, with no made-up "before".
export const changesOf = (detail: Record<string, unknown> | null | undefined): AuditChange[] => {
  const changes = detail?.changes;
  if (Array.isArray(changes)) return changes as AuditChange[];
  if (changes && typeof changes === "object") {
    return Object.entries(changes).map(([field, to]) => ({ field, label: prettyField(field), to }));
  }
  return [];
};

export const summaryOf = (detail: Record<string, unknown> | null | undefined): string => {
  if (!detail) return "";
  const parts: string[] = [];
  if (detail.label) parts.push(String(detail.label));
  if (detail.info) parts.push(String(detail.info));
  if (typeof detail.amount === "number") parts.push(formatRupees(detail.amount));
  if (detail.payment_method) parts.push(String(detail.payment_method));
  if (Array.isArray(detail.ids)) parts.push(detail.ids.map((id) => `#${id}`).join(", "));
  return parts.join(" · ");
};
