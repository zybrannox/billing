import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import { saveAs } from "file-saver";

import { apiService } from "../../api/service";
import { useDialogStore } from "../../store/useDialogStore";
import { generateInvoicePdf } from "../../utils/generateInvoicePdf";
import { shareToWhatsAppAfter } from "../../utils/shareToWhatsApp";
import InvoiceSheet from "../components/InvoiceSheet";
import { formatCurrency, type InvoiceDetail } from "../components/invoiceSheetUtils";

// Rendered as dialog content (see App.tsx's <Dialog type="viewInvoice">),
// not a standalone routed page - "View Invoice" used to navigate to
// /admin/invoices/:id, which meant leaving wherever it was clicked from
// (a customer's expanded row, the Billing tab, Projects) just to glance
// at a document. editingId comes from the same global dialog store every
// other dialog in the app already uses.
//
// Not used for the "Share to WhatsApp" action in
// admin/components/CustomerInvoicesList.tsx's row list - that shares
// straight from the row without opening this dialog at all (see
// utils/shareInvoiceToWhatsApp.ts, which renders the same InvoiceSheet
// off-screen instead).
export default function InvoiceView() {
  const { editingId, closeDialog } = useDialogStore();
  const id = editingId;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"download" | "share" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareMenuAnchor, setShareMenuAnchor] = useState<HTMLElement | null>(null);
  // Feature-detected once, not on every render - a browser without the Web
  // Share API (most desktop browsers) shouldn't show a menu option that
  // can only ever fail when clicked. WhatsApp itself is always offered
  // regardless (see handleShareWhatsApp) - it doesn't depend on this API.
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  // Renders the same .invoice-sheet DOM node visible on screen to a PDF
  // (see utils/generateInvoicePdf.ts) - shared by both Download and Share
  // below, so the two never risk producing different-looking documents.
  // The "pdf-exporting" class (see the print stylesheet below) strips the
  // on-screen card's border/shadow/rounded corners first - html2canvas
  // rasterizes exactly what's on screen, and a bordered, shadowed card
  // read as a screenshotted web widget rather than a printed page. The
  // Print button already avoids this via @media print, which only applies
  // to the browser's own print pipeline, not to this canvas capture.
  const buildPdfFile = async () => {
    if (!sheetRef.current || !invoice) return null;
    const node = sheetRef.current;
    node.classList.add("pdf-exporting");
    try {
      return await generateInvoicePdf(node, `Invoice-${invoice.invoice_number}.pdf`);
    } finally {
      node.classList.remove("pdf-exporting");
    }
  };

  const handleDownload = async () => {
    setExportError(null);
    setExporting("download");
    try {
      const file = await buildPdfFile();
      if (file) saveAs(file, file.name);
    } catch (err) {
      console.error("Failed to generate invoice PDF", err);
      setExportError("Couldn't generate the PDF. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const handleShareNative = async () => {
    setExportError(null);
    setExporting("share");
    try {
      const file = await buildPdfFile();
      if (!file || !invoice) return;

      const shareData = {
        files: [file],
        title: `Invoice ${invoice.invoice_number}`,
        text: `Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.amount)}`,
      };

      // Sharing an actual file (not a link) - this invoice's page needs
      // the viewer to be logged in, so a shared URL would be useless to a
      // customer without a Zybrannox account; the generated PDF works for
      // anyone, in whichever app the OS's own share sheet offers (which
      // WhatsApp - see handleShareWhatsApp below - usually isn't, on
      // desktop, since desktop WhatsApp typically doesn't register itself
      // as an OS share target the way it does on mobile).
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        // Some browsers support navigator.share but not file attachments -
        // still worth sharing the summary rather than doing nothing.
        await navigator.share({ title: shareData.title, text: shareData.text });
      }
    } catch (err) {
      // AbortError just means the user closed the OS share sheet without
      // picking anything - not a real failure worth surfacing as one.
      if ((err as DOMException)?.name !== "AbortError") {
        console.error("Failed to share invoice", err);
        setExportError("Couldn't share the invoice. Please try again.");
      }
    } finally {
      setExporting(null);
    }
  };

  // WhatsApp (desktop especially) usually isn't registered as an OS share
  // target, so it never shows up in handleShareNative's native share
  // sheet no matter how the button is clicked - this is a separate,
  // explicit path that always works. wa.me can only pre-fill text, never
  // attach a file, so getting the actual PDF into the chat means sharing
  // a link to it instead of the file itself: this uploads the same PDF
  // buildPdfFile() already renders to a small server-side endpoint (see
  // app/shared_documents), which hands back a public, token-addressed
  // URL - no login wall, since the person opening it in WhatsApp has no
  // Zybrannox account - and shares that link as the WhatsApp text.
  //
  // Uses shareToWhatsAppAfter (see utils/shareToWhatsApp.ts), not
  // shareToWhatsApp directly - this needs to upload the PDF first to know
  // the real link, and opening the wa.me window only after that async
  // work finishes would get it silently popup-blocked.
  const handleShareWhatsApp = async () => {
    if (!invoice) return;
    setExportError(null);
    setExporting("share");
    try {
      await shareToWhatsAppAfter(async () => {
        const file = await buildPdfFile();
        if (!file) throw new Error("Failed to generate the invoice PDF");
        const formData = new FormData();
        formData.append("file", file, file.name);
        const { url } = await apiService.post<{ url: string }>(
          `/invoices/${invoice.id}/share-link`,
          formData,
        );
        return `Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.amount)}\n${url}`;
      });
    } catch (err) {
      console.error("Failed to share invoice link to WhatsApp", err);
      setExportError("Couldn't prepare the invoice link. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(false);
    apiService
      .get<InvoiceDetail>(`/invoices/${id}/details`)
      .then((data) => {
        if (active) setInvoice(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      setInvoice(null);
    };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Preparing document...
        </Typography>
      </Box>
    );
  }

  if (error || !invoice) {
    return (
      <Box sx={{ textAlign: "center", py: 5 }}>
        <ReceiptLongRoundedIcon sx={{ fontSize: 48, color: "var(--slate-400)", mb: 1.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--slate-700)" }}>
          Invoice Not Found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          The requested invoice record could not be located or may have been deleted.
        </Typography>
        <Button
          variant="contained"
          disableElevation
          onClick={closeDialog}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Close
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Non-Printable Toolbar - this dialog's own header (see ui/Dialog.tsx)
          already has the title + close X, so this only needs the
          document actions, right-aligned instead of split against a
          "Back" button that no longer exists. */}
      <Box
        className="invoice-toolbar"
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mb: 1.5,
        }}
      >
        <Stack direction="row" spacing={1}>
          <Tooltip title="Download as PDF">
            <span>
              <IconButton
                onClick={handleDownload}
                disabled={exporting !== null}
                sx={{
                  border: "1px solid var(--slate-200)",
                  borderRadius: 2,
                  color: "var(--slate-700)",
                  "&:hover": { bgcolor: "var(--slate-100)" },
                }}
              >
                {exporting === "download" ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  <FileDownloadRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Share">
            <span>
              <IconButton
                onClick={(e) => setShareMenuAnchor(e.currentTarget)}
                disabled={exporting !== null}
                sx={{
                  border: "1px solid var(--slate-200)",
                  borderRadius: 2,
                  color: "var(--slate-700)",
                  "&:hover": { bgcolor: "var(--slate-100)" },
                }}
              >
                {exporting === "share" ? (
                  <CircularProgress size={20} thickness={5} />
                ) : (
                  <ShareRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Menu
            anchorEl={shareMenuAnchor}
            open={!!shareMenuAnchor}
            onClose={() => setShareMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem
              onClick={() => {
                setShareMenuAnchor(null);
                handleShareWhatsApp();
              }}
            >
              <ListItemIcon>
                <WhatsAppIcon fontSize="small" sx={{ color: "#25D366" }} />
              </ListItemIcon>
              <ListItemText>Share to WhatsApp</ListItemText>
            </MenuItem>
            {canShare && (
              <MenuItem
                onClick={() => {
                  setShareMenuAnchor(null);
                  handleShareNative();
                }}
              >
                <ListItemIcon>
                  <IosShareRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Share via...</ListItemText>
              </MenuItem>
            )}
          </Menu>

          <Button
            variant="contained"
            disableElevation
            startIcon={<PrintRoundedIcon />}
            onClick={() => window.print()}
            sx={{
              bgcolor: "var(--slate-900)",
              color: "var(--white)",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 2.5,
              "&:hover": { bgcolor: "var(--slate-800)" },
            }}
          >
            Print
          </Button>
        </Stack>
      </Box>
      {exportError && (
        <Box sx={{ pb: 1 }}>
          <Typography variant="caption" sx={{ color: "var(--red-600)", fontWeight: 600 }}>
            {exportError}
          </Typography>
        </Box>
      )}

      <InvoiceSheet ref={sheetRef} invoice={invoice} />

      {/* Global CSS for Print Optimization */}
      <style>{`
        /* Toggled on .invoice-sheet only for the instant html2canvas
           captures it (see buildPdfFile above) - the on-screen card chrome
           (border/shadow/rounded corners) has no place in a downloaded or
           shared PDF, same reasoning as @media print below stripping it
           for the browser's own print pipeline, which this capture never
           goes through. */
        .invoice-sheet.pdf-exporting {
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
        }

        @media print {
          @page {
            margin: 12mm;
            size: auto;
          }
          body {
            background-color: var(--white) !important;
            color: var(--black) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .invoice-sheet, .invoice-sheet * {
            visibility: visible;
          }
          .invoice-toolbar {
            display: none !important;
          }
          .invoice-sheet {
            /* fixed, not absolute - this now renders inside a MUI Dialog
               (see the component's own top comment), and "absolute" would
               position against whichever dialog wrapper is its nearest
               positioned ancestor rather than the actual printed page.
               "fixed" anchors to the viewport regardless of how deeply
               nested this is in the dialog's own DOM structure. */
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          .invoice-row {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </Box>
  );
}
