import { create } from "zustand";
import { apiService } from "../api/service";

export interface Invoice {
  id: number;
  project_id: number;
  invoice_number: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  due_date: string | null;
}

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
}

interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
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
  addInvoice: (
    data: Omit<Invoice, "id" | "created_at" | "invoice_number">,
  ) => Promise<Invoice>;
  updateInvoice: (id: number, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: number) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
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

  addInvoice: async (data) => {
    const newInvoice = await apiService.post<Invoice>("/invoices", data);
    // Re-fetch the current page rather than appending locally - a new
    // invoice may not belong on the page the user is currently viewing
    // (sorted newest-first, so it usually lands on page 1). The invoice
    // itself is already created at this point, so a refetch hiccup here
    // shouldn't surface as "creating the invoice failed" to the caller.
    try {
      await get().fetchInvoices({
        page: get().invoicesPage,
        pageSize: get().invoicesPageSize,
      });
    } catch (err) {
      console.error("Failed to refresh invoice list after creating invoice", err);
    }
    return newInvoice;
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
