import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, CssBaseline, Tooltip } from "@mui/material";
import { Outlet } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { usePermission } from "../hooks/usePermission";
import { useDialogStore } from "../store/useDialogStore";
import { employeeNavigations } from "./navigation";
import Menu from "../ui/Menu";
import Avatar from "../ui/Avatar";
import Drawer from "../ui/Drawer";
import { Suspense } from "react";
import PageSpinner from "../ui/PageSpinner";
import InvoiceQuickSearch from "../features/billing/InvoiceQuickSearch";
import { useInvalidateBilling } from "../features/billing/queries";
import { useOnDialogClose } from "../hooks/useOnDialogClose";


export default function EmployeeLayout() {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const canCreateInvoice = usePermission("invoice.create");
  const canEditInvoice = usePermission("invoice.edit");
  const canManageWorkspace = usePermission("workspace.manage");
  const canSeeInvoices = canCreateInvoice || canEditInvoice;
  const openDialog = useDialogStore((s) => s.openDialog);

  // An invoice dialog may have changed what the invoice list behind it shows.
  const invalidateBilling = useInvalidateBilling();
  useOnDialogClose(invalidateBilling);

  const handleDrawerToggle = () => setOpen((p) => !p);
  const handleDrawerClose = () => setOpen(false);

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        {/* Drawer: component decides permanent vs temporary based on breakpoints */}
        <Drawer
          navigations={employeeNavigations({ canManageWorkspace, canSeeInvoices })}
          open={open}
          onClose={handleDrawerClose}
          onToggle={handleDrawerToggle}
        />
        {/* Main area */}
        {/* minWidth: 0 lets this flex item actually shrink when the drawer
            expands, instead of being held to its content's intrinsic width. */}
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, minHeight: "100vh" }}>
          {/* Topbar */}
          <MuiAppBar
            position="relative"
            sx={{
              background: "transparent",
              boxShadow: "none",
              zIndex: !open ? theme.zIndex.drawer + 1 : theme.zIndex.appBar,
            }}
          >
            <MuiToolbar sx={{ justifyContent: "space-between" }}>
              <IconButton onClick={handleDrawerToggle}>
                <MenuOutlined sx={{ color: "var(--black)" }} />
              </IconButton>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {canSeeInvoices && <InvoiceQuickSearch />}
                {canCreateInvoice && (
                  <Tooltip title="Create Invoice">
                    <IconButton
                      aria-label="Create Invoice"
                      onClick={() => openDialog("invoiceDesignComplete")}
                      sx={{ mr: 0.5, color: "var(--slate-600)", "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" } }}
                    >
                      <ReceiptLongRoundedIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Avatar />
                <Menu />
              </Box>
            </MuiToolbar>
          </MuiAppBar>
          {/* Page content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "var(--white)",
              transition: theme.transitions.create("margin", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}
          >
            <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
          </Box>
        </Box>
      </Box>
    </>
  );
}
