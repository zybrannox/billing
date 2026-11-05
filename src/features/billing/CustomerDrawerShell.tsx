import type { ReactNode } from "react";
import { Box, Drawer, IconButton, Tooltip, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { formatRupees } from "../../format/money";
import ContactLinks from "../../ui/ContactLinks";
import InitialsAvatar from "../../ui/InitialsAvatar";

export interface DrawerCustomer {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string | null;
  email: string | null;
  // Known when opened from the Customers list, which fetches them per row.
  outstanding_balance?: number | null;
  invoice_count?: number | null;
}

// The right-side panel chrome for "a customer's X": who they are, what they owe,
// and a scrolling body. Contents are whatever list the caller passes. `onClose`
// fires however the drawer is dismissed (close button, backdrop, Esc). Pass
// `customer={null}` to keep it closed.
export default function CustomerDrawerShell({
  customer,
  title,
  onClose,
  children,
}: {
  customer: DrawerCustomer | null;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Drawer
      anchor="right"
      open={customer !== null}
      onClose={onClose}
      // The app header sits at drawer + 1 when the sidebar is collapsed
      // (see layouts/AdminLayout.tsx) - one more keeps this above it while still
      // under modals, so the invoice/confirm dialogs open on top of it.
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
      slotProps={{ paper: { sx: { width: { xs: "100vw", sm: 520 }, bgcolor: "var(--slate-50)" } } }}
    >
      {customer && (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ bgcolor: "var(--white)", borderBottom: "1px solid var(--slate-200)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2 }}>
              <InitialsAvatar name={`${customer.first_name} ${customer.last_name}`} size={44} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: "var(--fs-2xl)", lineHeight: 1.25, color: "var(--slate-900)" }}>
                  {customer.first_name} {customer.last_name}
                </Typography>
                <ContactLinks phone={customer.contact_number} email={customer.email} />
              </Box>
              <Tooltip title="Close">
                <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ alignSelf: "flex-start" }}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {customer.outstanding_balance != null && (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", bgcolor: "var(--slate-50)", borderTop: "1px solid var(--slate-100)" }}>
                <Box sx={{ px: 2, py: 1.25 }}>
                  <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>Outstanding</Typography>
                  <Typography sx={{ fontSize: "var(--fs-3xl)", fontWeight: 700, lineHeight: 1.25, color: customer.outstanding_balance > 0 ? "var(--red-600)" : "var(--slate-900)" }}>
                    {formatRupees(customer.outstanding_balance)}
                  </Typography>
                </Box>
                <Box sx={{ px: 2, py: 1.25 }}>
                  <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>Invoices</Typography>
                  <Typography sx={{ fontSize: "var(--fs-3xl)", fontWeight: 700, lineHeight: 1.25, color: "var(--slate-900)" }}>
                    {customer.invoice_count ?? 0}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}>
            <Typography component="h2" sx={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--slate-900)", mb: 1 }}>
              {title}
            </Typography>
            {children}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
