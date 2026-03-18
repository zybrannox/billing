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

interface InvoiceState {
  invoices: Invoice[];
  fetchInvoices: () => Promise<void>;
  addInvoice: (data: Omit<Invoice, "id" | "created_at">) => Promise<Invoice>;
  updateInvoice: (id: number, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: number) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],

  fetchInvoices: async () => {
    const invoices = await apiService.get<Invoice[]>("/invoices");
    set({ invoices });
  },

  addInvoice: async (data) => {
    const newInvoice = await apiService.post<Invoice>("/invoices", data);
    set((state) => ({ invoices: [...state.invoices, newInvoice] }));
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
    }));
  },
}));
