import { create } from "zustand";
import { devtools } from "zustand/middleware";

// The client portal's own session, deliberately separate from useAppStore
// (staff) - keyed by customer_id, not a username+role, since a client is
// never "one of the staff roles" (see app/client_auth on the backend,
// which signs these with an entirely different secret/cookie).
export type ClientUser = {
  customerId: number;
  email: string | null;
  firstName: string;
  lastName: string;
  companyId: number | null;
  companyName: string | null;
};

type ClientAppState = {
  clientUser: ClientUser | null;
  setClientUser: (user: ClientUser) => void;
  clearClientUser: () => void;
};

export const useClientAppStore = create<ClientAppState>()(
  devtools(
    (set) => ({
      clientUser: null,
      setClientUser: (clientUser) => set({ clientUser }),
      clearClientUser: () => set({ clientUser: null }),
    }),
    { name: "ClientAppStore" }
  )
);
