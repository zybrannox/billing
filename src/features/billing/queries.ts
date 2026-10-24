import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../api/service";
import type { InvoiceListResponse, QuotationListResponse } from "../../api/types";

// Server data for the billing lists goes through TanStack Query, not
// component state: one cache, one key scheme, and "refresh after a change" is
// just invalidating a key instead of threading a reload function around.
// (The same pattern is the template for the other features' lists.)
export const billingKeys = {
  invoices: ["invoices"] as const,
  invoiceList: (params: object) => ["invoices", "list", params] as const,
  quotations: ["quotations"] as const,
  quotationList: (params: object) => ["quotations", "list", params] as const,
};

export interface InvoiceListQuery {
  customer_id?: number;
  company_id?: number;
  page: number;
  page_size: number;
}

// Keep showing the current page while the next one loads, rather than
// flashing the list back to a spinner - but only while it is still the same
// list. Switching to another customer/company must show the loading state,
// never the previous one's rows (with their action buttons live).
const scopeOf = (params: object) => {
  const { page: _ignored, ...scope } = params as Record<string, unknown>;
  void _ignored;
  return JSON.stringify(scope);
};

// True when two list queries differ only by page.
export const isSameList = (a: object | undefined, b: object) => !!a && scopeOf(a) === scopeOf(b);

const keepWithinSameList =
  (params: object) =>
  <T,>(previous: T | undefined, previousQuery?: { queryKey: readonly unknown[] }) =>
    isSameList(previousQuery?.queryKey[2] as object | undefined, params) ? previous : undefined;

export function useInvoiceList(params: InvoiceListQuery) {
  return useQuery({
    queryKey: billingKeys.invoiceList(params),
    queryFn: () => apiService.get<InvoiceListResponse>("/invoices/", { params }),
    placeholderData: keepWithinSameList(params),
  });
}

export interface QuotationListQuery {
  customer_id?: number;
  page: number;
  page_size: number;
}

export function useQuotationList(params: QuotationListQuery) {
  return useQuery({
    queryKey: billingKeys.quotationList(params),
    queryFn: () => apiService.get<QuotationListResponse>("/quotations/", { params }),
    placeholderData: keepWithinSameList(params),
  });
}

// Marks every invoice / quotation list stale; the ones on screen refetch
// immediately, the rest on next mount.
export function useInvalidateBilling() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: billingKeys.invoices }),
      client.invalidateQueries({ queryKey: billingKeys.quotations }),
    ]);
}
