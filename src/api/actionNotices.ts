// What every action in the app says when it works or fails, in one list. The
// API client (api/client.ts) looks each save, upload and delete up here and
// shows the result in the top-right corner, so no screen can forget to.
//
// An action not listed here still reports its failure (with a generic title);
// it just doesn't announce success. To add one, add a line below.
import axios from "axios";
import type { NoticeInput } from "../store/useNoticeStore";
import { useAppStore } from "../store/useAppStore";
import { TransferMessageError, TransferStalledError } from "./transfer";

type Method = "post" | "put" | "patch" | "delete";
type Body = Record<string, unknown> | null;
type Res = Record<string, unknown> | null;

interface Action {
  method: Method;
  path: RegExp;
  /** What to say when it worked; null stays quiet (the screen says it itself). */
  success: null | string | ((body: Body, res: Res, path: string) => Omit<NoticeInput, "tone"> | string);
  /** The headline when it fails; the reason goes underneath. */
  failure: string;
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const arrayLength = (value: unknown) => (Array.isArray(value) ? value.length : 0);

/** Where the projects list lives for whoever is signed in. */
export const projectLink = (id: unknown) =>
  `${useAppStore.getState().user?.role === "admin" ? "/admin/projects" : "/"}?projectId=${id}`;

const ACTIONS: Action[] = [
  // Projects
  {
    method: "post",
    path: /^\/projects\/?$/,
    success: (_, res) => ({ title: "Project added", action: res?.id ? { label: "Show project", to: projectLink(res.id) } : undefined }),
    failure: "Couldn't add the project",
  },
  { method: "put", path: /^\/projects\/\d+$/, success: "Project saved", failure: "Couldn't save the project" },
  { method: "delete", path: /^\/projects\/\d+$/, success: "Project moved to the Bin", failure: "Couldn't delete the project" },
  { method: "post", path: /^\/projects\/bulk-delete$/, success: (b) => `${count(arrayLength(b?.ids), "project")} moved to the Bin`, failure: "Couldn't delete the projects" },
  { method: "patch", path: /^\/projects\/\d+\/design-completed$/, success: "Design marked complete", failure: "Couldn't update the design status" },
  { method: "patch", path: /^\/projects\/\d+\/print-completed$/, success: "Print marked complete", failure: "Couldn't update the print status" },
  { method: "patch", path: /^\/projects\/\d+\/delivered$/, success: "Marked as delivered", failure: "Couldn't mark it delivered" },
  { method: "patch", path: /^\/projects\/\d+\/pin$/, success: (_, res) => (res?.is_pinned ? "Project pinned" : "Project unpinned"), failure: "Couldn't pin the project" },
  { method: "patch", path: /^\/projects\/\d+\/notify$/, success: null, failure: "Couldn't notify the client" },

  // Files. Uploads report per file from the uploader itself (one notice for a
  // whole batch); the requests underneath stay quiet.
  { method: "post", path: /^\/files\/upload(\/.*)?$/, success: null, failure: "" },
  {
    method: "post",
    path: /^\/files\/attach\/\d+$/,
    success: (b) => `${count(arrayLength(b?.files), "file")} added to the project`,
    failure: "Couldn't add the files to the project",
  },
  { method: "delete", path: /^\/files\/[^/]+$/, success: null, failure: "Couldn't delete the file" },
  { method: "post", path: /^\/files\/bulk-delete$/, success: (b) => `${count(arrayLength(b?.paths), "file")} moved to the Bin`, failure: "Couldn't delete the files" },
  { method: "post", path: /^\/files\/download\/.+\/confirm$/, success: null, failure: "" },

  // Customers and companies
  { method: "post", path: /^\/customers\/?$/, success: "Customer added", failure: "Couldn't add the customer" },
  { method: "put", path: /^\/customers\/\d+$/, success: "Customer saved", failure: "Couldn't save the customer" },
  { method: "delete", path: /^\/customers\/\d+$/, success: "Customer moved to the Bin", failure: "Couldn't delete the customer" },
  { method: "post", path: /^\/client-auth\/invite\/\d+$/, success: null, failure: "Couldn't create the portal invite" },
  { method: "post", path: /^\/customers\/\d+\/payments$/, success: "Payment saved", failure: "Couldn't save the payment" },
  { method: "post", path: /^\/customer-payments\/\d+\/apply$/, success: "Credit applied", failure: "Couldn't apply the credit" },
  { method: "delete", path: /^\/customer-payments\/\d+$/, success: "Payment deleted; its invoices are owed again", failure: "Couldn't delete the payment" },
  { method: "post", path: /^\/companies\/?$/, success: "Company added", failure: "Couldn't add the company" },
  { method: "put", path: /^\/companies\/\d+$/, success: "Company saved", failure: "Couldn't save the company" },
  { method: "delete", path: /^\/companies\/\d+$/, success: "Company moved to the Bin", failure: "Couldn't delete the company" },

  // Invoices and quotations
  { method: "post", path: /^\/invoices\/?$/, success: "Invoice created", failure: "Couldn't create the invoice" },
  {
    method: "patch",
    path: /^\/invoices\/\d+$/,
    success: (b) => (b?.status === "cancelled" ? "Invoice cancelled" : "Invoice saved"),
    failure: "Couldn't save the invoice",
  },
  { method: "patch", path: /^\/invoices\/\d+\/mark-paid$/, success: "Invoice marked as paid", failure: "Couldn't mark the invoice paid" },
  { method: "patch", path: /^\/invoices\/\d+\/record-payment$/, success: "Payment recorded", failure: "Couldn't record the payment" },
  { method: "delete", path: /^\/invoices\/\d+$/, success: "Invoice moved to the Bin", failure: "Couldn't delete the invoice" },
  { method: "post", path: /^\/(invoices|quotations)\/\d+\/share-link$/, success: null, failure: "Couldn't create the share link" },
  { method: "post", path: /^\/quotations\/?$/, success: "Quotation created", failure: "Couldn't create the quotation" },
  {
    method: "patch",
    path: /^\/quotations\/\d+\/status$/,
    success: (b) => `Quotation ${typeof b?.status === "string" ? b.status : "updated"}`,
    failure: "Couldn't update the quotation",
  },
  { method: "post", path: /^\/quotations\/\d+\/convert$/, success: "Invoice created from the quotation", failure: "Couldn't turn the quotation into an invoice" },

  // Notes, job requests, issues
  { method: "post", path: /^\/notes\/?$/, success: "Note added", failure: "Couldn't add the note" },
  {
    method: "patch",
    path: /^\/notes\/\d+$/,
    success: (b) => (b && "is_done" in b ? (b.is_done ? "Note marked done" : "Note reopened") : "Note saved"),
    failure: "Couldn't save the note",
  },
  { method: "delete", path: /^\/notes\/\d+$/, success: "Note deleted", failure: "Couldn't delete the note" },
  { method: "post", path: /^\/job-requests\/\d+\/convert$/, success: "Job request accepted and added as a project", failure: "Couldn't accept the job request" },
  { method: "post", path: /^\/job-requests\/\d+\/reject$/, success: "Job request declined", failure: "Couldn't decline the job request" },
  { method: "post", path: /^\/issues\/?$/, success: "Thanks, your report was sent", failure: "Couldn't send the report" },
  { method: "patch", path: /^\/issues\/\d+$/, success: "Issue updated", failure: "Couldn't update the issue" },

  // Employees and access
  { method: "post", path: /^\/users\/?$/, success: "Employee added", failure: "Couldn't add the employee" },
  { method: "put", path: /^\/users\/\d+$/, success: "Employee saved", failure: "Couldn't save the employee" },
  { method: "delete", path: /^\/users\/\d+$/, success: "Employee removed", failure: "Couldn't remove the employee" },
  { method: "put", path: /^\/users\/\d+\/permissions$/, success: "Access updated", failure: "Couldn't update access" },
  { method: "patch", path: /^\/users\/\d+\/password$/, success: "Password changed", failure: "Couldn't change the password" },

  // Settings
  { method: "put", path: /^\/document-settings\/?$/, success: "Invoice design saved", failure: "Couldn't save the invoice design" },
  { method: "post", path: /^\/document-settings\/logo$/, success: "Logo uploaded", failure: "Couldn't upload the logo" },
  { method: "delete", path: /^\/document-settings\/logo$/, success: "Logo removed", failure: "Couldn't remove the logo" },
  { method: "post", path: /^\/list-options\/?$/, success: "Option added", failure: "Couldn't add the option" },
  { method: "patch", path: /^\/list-options\/\d+\/pricing$/, success: "Pricing saved", failure: "Couldn't save the pricing" },
  { method: "patch", path: /^\/list-options\/\d+\/(reactivate|deactivate)$/, success: (_, __, p) => (p.endsWith("reactivate") ? "Option turned on" : "Option turned off"), failure: "Couldn't change the option" },

  // Bin and backups say what happened on their own page.
  { method: "post", path: /^\/bin\/\d+\/restore$/, success: null, failure: "" },
  { method: "delete", path: /^\/bin\/(\d+)?$/, success: null, failure: "" },
  { method: "post", path: /^\/backups\/run$/, success: null, failure: "" },
];

// Signing in and out report on their own forms; nothing else to say.
const QUIET = [/^\/auth\//, /^\/client-auth\/(login|logout|activate|forgot-password|reset-password)$/];

/** The request's path without the server address or query string. */
export function pathOf(url: string | undefined): string {
  const raw = (url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  return raw.length > 1 ? raw.replace(/\/+$/, "") || "/" : raw;
}

export function parseBody(data: unknown): Body {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof data === "object" && data !== null && !(data instanceof FormData) ? (data as Body) : null;
}

const find = (method: string, path: string) =>
  ACTIONS.find((a) => a.method === method && a.path.test(path));

/** The notice for a change that worked, or null for none. */
export function successNotice(method: string, url: string | undefined, body: unknown, response: unknown): NoticeInput | null {
  const path = pathOf(url);
  const action = find(method, path);
  if (!action || action.success === null || QUIET.some((q) => q.test(path))) return null;
  const said = typeof action.success === "string" ? action.success : action.success(parseBody(body), parseBody(response), path);
  return typeof said === "string" ? { tone: "success", title: said } : { tone: "success", ...said };
}

// A validation failure names the field: "Customer id: Field required".
function validationMessage(first: unknown): string | null {
  const { msg, loc } = (first ?? {}) as { msg?: unknown; loc?: unknown };
  if (typeof msg !== "string") return null;
  const field = Array.isArray(loc) ? [...loc].reverse().find((part) => typeof part === "string" && part !== "body") : undefined;
  if (typeof field !== "string") return msg;
  const name = field.replace(/_/g, " ");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}: ${msg}`;
}

/**
 * Why a request failed, in words for the person at the counter. When the
 * server may have saved it anyway (it answered too late, or crashed), says so,
 * rather than inviting them to add the same thing twice.
 */
export function describeError(err: unknown): string {
  if (err instanceof TransferMessageError) return err.message;
  if (err instanceof TransferStalledError) return "The connection stopped responding. Check the list before trying again: it may have been saved.";
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT")
      return "The server took too long to answer. Refresh to check whether it was saved before trying again.";
    if (!err.response) return "No connection to the server. Check the internet and try again; nothing was saved.";
    const { status, data } = err.response;
    const detail = (data as { detail?: unknown } | undefined)?.detail;
    const said = typeof detail === "string" ? detail : Array.isArray(detail) ? validationMessage(detail[0]) : null;
    if (status === 403) return said && !/not authenticated/i.test(said) ? said : "You don't have permission to do this. Ask an admin.";
    if (status === 404) return said ?? "It no longer exists. It may have been deleted by someone else; refresh the page.";
    if (status === 409) return said ?? "Someone else changed this at the same time. Refresh and try again.";
    if (status === 413) return "The file is too large for the server to accept.";
    if (status === 429) return "Too many attempts. Wait a minute and try again.";
    if (status >= 500) return "The server had a problem. Refresh to check whether it was saved, then try again.";
    if (said) return said;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

/** The notice for a change that failed, or null when the screen handles it. */
export function failureNotice(method: string, url: string | undefined, err: unknown): NoticeInput | null {
  const path = pathOf(url);
  if (QUIET.some((q) => q.test(path))) return null;
  // Signed out: the app is already on its way to the login page.
  if (axios.isAxiosError(err) && err.response?.status === 401) return null;
  // Cancelled on purpose (closing an upload, leaving the page).
  if (axios.isCancel(err) || (axios.isAxiosError(err) && err.code === "ERR_CANCELED")) return null;
  const action = find(method, path);
  if (action && action.failure === "") return null;
  return { tone: "error", title: action?.failure || "That didn't work", message: describeError(err) };
}
