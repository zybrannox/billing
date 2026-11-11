import { useMemo, useState } from "react";
import { Alert, Box, Button as MuiButton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import type { InvoiceDetail } from "../billing/invoiceSheetUtils";
import { useDocumentSettings } from "../documents/useDocumentSettingsStore";
import { isAndroid, loadPrinterSettings, savePrinterSettings, type PrinterSettings } from "../documents/receipt/printerSettings";
import { COLUMNS, invoiceReceipt, type PaperWidth } from "../documents/receipt/receipt";
import ReceiptPreview from "../documents/receipt/ReceiptPreview";
import { sendReceipt } from "../documents/receipt/sendReceipt";
import Panel from "../../ui/Panel";

// A made-up bill, so the printer can be tested before printing a real one.
const SAMPLE: InvoiceDetail = {
  id: 0,
  project_id: 0,
  invoice_number: "TEST-PRINT",
  status: "pending",
  subtotal: 1200,
  discount_amount: 0,
  amount: 1200,
  created_at: new Date().toISOString(),
  due_date: null,
  advance_amount: 500,
  payment_method: "UPI",
  payment_reference: null,
  balance_due: 700,
  customer_name: "Sample Customer",
  project_type: null,
  project_description: null,
  project: null,
  customer: { first_name: "Sample", last_name: "Customer", contact_number: "9876543210", email: null, company_name: null, company_address: null },
  items: [
    { id: 1, description: "Flex banner", width: 10, height: 6, unit: "ft", sq_ft: 60, rate: 15, pieces: 1, total: 900, is_manual_total: false, has_dimensions: true, sort_order: 0, project_file_id: null },
    { id: 2, description: "Installation", width: 0, height: 0, unit: "ft", sq_ft: 0, rate: 150, pieces: 2, total: 300, is_manual_total: false, has_dimensions: false, sort_order: 1, project_file_id: null },
  ],
  payments: [],
};

const toggleSx = { textTransform: "none", fontWeight: 600, px: 1.5, py: 0.5, fontSize: "var(--fs-sm)" } as const;
const labelSx = { fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)", mb: 0.5 } as const;

// How this device prints receipts. Saved in this browser only: each counter
// has its own printer, so a phone and a PC can be set up differently.
export default function ReceiptPrinterPanel() {
  const { settings } = useDocumentSettings();
  const [printer, setPrinter] = useState<PrinterSettings>(loadPrinterSettings);
  const lines = useMemo(() => invoiceReceipt(SAMPLE, settings, COLUMNS[printer.paper]), [settings, printer.paper]);

  const update = (patch: Partial<PrinterSettings>) => {
    const next = { ...printer, ...patch };
    savePrinterSettings(next);
    setPrinter(next);
  };

  return (
    <Panel
      title="Receipt printer"
      description="How this device prints bills on a thermal receipt printer when you press Receipt on an invoice. Saved on this device only."
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          <Box>
            <Typography sx={labelSx}>Paper roll</Typography>
            <ToggleButtonGroup size="small" exclusive value={printer.paper} onChange={(_, v: PaperWidth | null) => v && update({ paper: v })} aria-label="Paper roll width">
              <ToggleButton value={58} sx={toggleSx}>58 mm</ToggleButton>
              <ToggleButton value={80} sx={toggleSx}>80 mm</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography sx={labelSx}>Print using</Typography>
            <ToggleButtonGroup size="small" exclusive value={printer.route} onChange={(_, v: PrinterSettings["route"] | null) => v && update({ route: v })} aria-label="How to print">
              <ToggleButton value="device" sx={toggleSx}>This device's printer</ToggleButton>
              <ToggleButton value="rawbt" sx={toggleSx}>Bluetooth (RawBT, Android)</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {printer.route === "device" ? (
          <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-600)", lineHeight: 1.6 }}>
            Uses any printer installed on this computer or phone: USB, or Bluetooth paired in the system settings. The first time, choose the
            receipt printer in the print window and set margins to <b>None</b>; most browsers remember it.
          </Typography>
        ) : (
          <Alert severity={isAndroid() ? "info" : "warning"} sx={{ fontSize: "var(--fs-sm)" }}>
            {isAndroid()
              ? "Opens the free RawBT app, which prints on the Bluetooth printer paired in it. Install RawBT and choose your printer there once."
              : "RawBT is an Android app, and this isn't an Android device. Here, use “This device's printer”."}
          </Alert>
        )}

        <ReceiptPreview lines={lines} paper={printer.paper} />

        <Box>
          <MuiButton
            variant="contained"
            disableElevation
            startIcon={<PrintRoundedIcon />}
            onClick={() => sendReceipt(lines, printer)}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: "var(--slate-900)", "&:hover": { bgcolor: "var(--slate-800)" } }}
          >
            Print test receipt
          </MuiButton>
        </Box>
      </Box>
    </Panel>
  );
}
