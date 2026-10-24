import type { ReactNode } from "react";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export interface DrawerCustomer {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string | null;
  email: string | null;
}

// The right-side panel chrome shared by every "a customer's X" drawer
// (invoices, quotations): customer name and contact in the header, a close
// button, and a scrolling body under a small section label. Contents are
// whatever list the caller passes. `onClose` fires however the drawer is
// dismissed (close button, backdrop, Esc). Pass `customer={null}` to keep
// it closed.
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
      slotProps={{ paper: { sx: { width: { xs: "100vw", sm: 480 }, bgcolor: "var(--slate-50)" } } }}
    >
      {customer && (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
              p: 2.5,
              bgcolor: "var(--white)",
              borderBottom: "1px solid var(--slate-200)",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-3xl)", color: "var(--slate-900)" }} noWrap>
                {customer.first_name} {customer.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {customer.contact_number || "-"}
                {customer.email ? ` · ${customer.email}` : ""}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
            <Typography
              sx={{ fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.05em", color: "var(--slate-500)", mb: 1.5 }}
            >
              {title}
            </Typography>
            {children}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
