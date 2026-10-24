import { create } from "zustand";
import { apiService } from "../../api/service";
import type { Invoice, InvoiceListResponse } from "../../api/types";

export type { Invoice } from "../../api/types";

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

interface InvoiceState {
  invoices: Invoice[];
  invoicesTotal: number;
  invoicesPage: number;
  invoicesPageSize: number;
  invoicesTotalPages: number;
  invoicesLoading: boolean;
  /** GET (server-side paginated - see backend GET /invoices/). Previously
   * fetched every invoice unpaginated; billing history only ever grows, so
   * that response got slower and larger forever instead of staying flat. */
  fetchInvoices: (params?: InvoiceListParams) => Promise<void>;
  // Invoice creation lives in features/billing/GenerateInvoice.tsx (line-item
  // based, POST /invoices/ called directly - see that file) rather than
  // through this store, since the payload is a project_id + items array,
  // not a flat Invoice shape this store's other methods operate on.
  updateInvoice: (id: number, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: number) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],
  invoicesTotal: 0,
  invoicesPage: 1,
  invoicesPageSize: 20,
  invoicesTotalPages: 0,
  invoicesLoading: false,

  fetchInvoices: async (params = {}) => {
    set({ invoicesLoading: true });
    try {
      const res = await apiService.get<InvoiceListResponse>("/invoices", {
        params: {
          page: params.page ?? 1,
          page_size: params.pageSize ?? 20,
          search: params.search || undefined,
        },
      });
      set({
        invoices: res.items,
        invoicesTotal: res.total,
        invoicesPage: res.page,
        invoicesPageSize: res.page_size,
        invoicesTotalPages: res.total_pages,
      });
    } finally {
      set({ invoicesLoading: false });
    }
  },

  updateInvoice: async (id, data) => {
    const updatedInvoice = await apiService.patch<Invoice>(
      `/invoices/${id}`,
      data,
    );
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id ? updatedInvoice : inv,
      ),
    }));
  },

  deleteInvoice: async (id) => {
    await apiService.delete(`/invoices/${id}`);
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.id !== id),
      invoicesTotal: Math.max(0, state.invoicesTotal - 1),
    }));
  },
}));
