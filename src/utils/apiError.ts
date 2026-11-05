import axios from "axios";
import { TransferMessageError, TransferStalledError } from "../api/transfer";

// Small shared helper for the client-portal pages (which don't go through
// useApiRequest.tsx - that hook is hardcoded to the staff apiService) to
// pull a displayable message out of an axios error without resorting to
// an `any`-typed catch variable.
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  }
  return fallback;
}

type ErrorBody = { detail?: unknown; message?: unknown };

// An axios error's response body, or a body already unwrapped (useApiRequest's
// onError passes that), or any other thrown error.
const bodyOf = (err: unknown): ErrorBody | null => {
  const body = axios.isAxiosError(err) ? err.response?.data || err : err;
  return typeof body === "object" && body !== null ? (body as ErrorBody) : null;
};

// What the server said, as one line. `detail` is a string for errors raised on
// purpose and a list of {msg} for validation failures; rendering that list
// directly crashes React, so nothing should read `detail` by hand.
export function getErrorDetail(err: unknown): string | null {
  const detail = bodyOf(err)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (typeof first?.msg === "string") return first.msg;
  }
  return null;
}

// As above, then the error's own message (e.g. "Network Error"), then `fallback`.
export function getErrorMessage(err: unknown, fallback: string): string {
  const message = bodyOf(err)?.message;
  return getErrorDetail(err) ?? (typeof message === "string" ? message : fallback);
}

// For uploads and downloads, where "try again" is much more useful with a reason.
export function getTransferErrorMessage(err: unknown, action: "upload" | "download"): string {
  if (err instanceof TransferMessageError) return err.message;
  const failed = `${action === "upload" ? "Upload" : "Download"} failed`;
  if (err instanceof TransferStalledError) {
    return `${failed}: the connection stopped responding. Please try again.`;
  }
  if (axios.isAxiosError(err)) {
    if (!err.response) return `${failed}: the connection was lost. Please check your internet and try again.`;
    if (err.response.status === 413) return `${failed}: the file is too large for the server to accept.`;
    if (err.response.status === 401) return `${failed}: your session has expired. Please log in again.`;
    if (err.response.status >= 500) return `${failed}: the server had a problem. Please try again in a moment.`;
  }
  return getApiErrorMessage(err, `${failed}. Please try again.`);
}
