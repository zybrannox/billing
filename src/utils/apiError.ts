import axios from "axios";

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
