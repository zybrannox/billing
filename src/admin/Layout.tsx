import React from "react";
import { Box, Tooltip } from "@mui/material";
import { Outlet } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import { AppBar as MuiAppBar, Toolbar as MuiToolbar } from "@mui/material";
import { MenuOutlined } from "@mui/icons-material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import { adminNavigations } from "../config/admin";
import Avatar from "../ui/Avatar";
import Menu from "../ui/Menu";
import Dialog from "../ui/Dialog";
import Drawer from "../common/components/Drawer";
import NotificationBell from "./components/NotificationBell";
import { useDialogStore } from "../store/useDialogStore";
import GenerateInvoice from "../common/pages/GenerateInvoice";
import GenerateQuotation from "../common/pages/GenerateQuotation";

// Heading variants get their own fontFamily (see index.css's --font-
// heading/h1-h6 rule) - a plain global `h1{...}` selector in index.css
// can't reliably win against MUI's own emotion-generated styles, so the
// theme itself is the only place this is guaranteed to apply to every
// Typography variant="h1".."h6" in the admin app, regardless of which
// element it actually renders as.
const theme = createTheme({
  typography: {
    fontFamily: "var(--font-noto-sans)",
    h1: { fontFamily: "var(--font-heading)" },
    h2: { fontFamily: "var(--font-heading)" },
    h3: { fontFamily: "var(--font-heading)" },
    h4: { fontFamily: "var(--font-heading)" },
    h5: { fontFamily: "var(--font-heading)" },
    h6: { fontFamily: "var(--font-heading)" },
  },
});

export default function AdminLayout() {
  const [open, setOpen] = React.useState(false);
  const openDialog = useDialogStore((s) => s.openDialog);

  // No auto-close timer: on mobile the drawer is a temporary overlay that
  // must stay open until the user picks a link or taps the backdrop/close
  // button - auto-closing it after a few seconds mid-decision is a trap.

  const handleDrawerToggle = () => setOpen((p) => !p);
  const handleDrawerClose = () => setOpen(false);

  return (
    // `theme` was previously created but never actually provided to the
    // tree - every MUI component (Typography, Button, TextField, dialogs,
    // DataGrid...) has been silently using MUI's own built-in default
    // theme this whole time, including its default Roboto/Helvetica/Arial
    // font stack, regardless of what this file configured. This is the
    // fix that makes the configured typography (Inter body, Plus Jakarta
    // Sans headings - see the theme above) actually take effect.
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex" }}>
        {/* Drawer: component decides permanent vs temporary based on breakpoints */}
        <Drawer
          open={open}
          onClose={handleDrawerClose}
          onToggle={handleDrawerToggle}
          navigations={adminNavigations}
        />
        {/* Main area */}
        {/* minWidth: 0 is required so this flex item actually shrinks when
            the drawer expands, instead of being held to its content's
            intrinsic width (the classic flexbox min-width:auto trap). */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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
              <IconButton color="inherit" onClick={handleDrawerToggle}>
                <MenuOutlined sx={{ color: "#000" }} />
              </IconButton>

              <Box sx={{ display: "flex", alignItems: "center" }}>
                {/* Reachable from every admin page, not just Projects' own
                    per-row action - opens the same GenerateInvoice dialog
                    with no project pre-selected, so it defaults to its own
                    "New Job" mode instead of the read-only preview a
                    known project id would show (see GenerateInvoice.tsx's
                    isNewJob/showExistingPicker branches). */}
                <Tooltip title="Create Invoice">
                  <IconButton
                    onClick={() => openDialog("invoiceDesignComplete")}
                    sx={{
                      mr: 0.5,
                      color: "var(--slate-600)",
                      "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                    }}
                  >
                    <ReceiptLongRoundedIcon sx={{ fontSize: 22 }} />
                  </IconButton>
                </Tooltip>
                {/* A pre-invoice estimate for a customer who hasn't
                    committed to the job yet - see GenerateQuotation.tsx.
                    Reachable from every admin page, same as Create
                    Invoice, since there's no "Quotations" nav item. */}
                <Tooltip title="Create Quotation">
                  <IconButton
                    onClick={() => openDialog("quotation")}
                    sx={{
                      mr: 0.5,
                      color: "var(--slate-600)",
                      "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                    }}
                  >
                    <RequestQuoteRoundedIcon sx={{ fontSize: 22 }} />
                  </IconButton>
                </Tooltip>
                <NotificationBell />
                <Avatar />
                <Menu />
              </Box>
            </MuiToolbar>
          </MuiAppBar>
          {/* Page content */}
          <Outlet />
        </Box>
      </Box>

      {/* xl, not md - both forms host a full line-item table (see
          common/components/ItemLineEditor.tsx) that wants up to ~1280px to
          avoid its own internal horizontal scrollbar (see
          GenerateInvoice.tsx/GenerateQuotation.tsx's own content maxWidth);
          now that Dialog.tsx's maxWidth prop actually caps the dialog
          (rather than always auto-growing to the viewport), these need a
          wide enough breakpoint or they'd shrink back to md's 900px. */}
      <Dialog type="invoiceDesignComplete" title="Invoice" children={<GenerateInvoice />} maxWidth="xl" />
      <Dialog type="quotation" title="Quotation" children={<GenerateQuotation />} maxWidth="xl" />
    </ThemeProvider>
  );
}
