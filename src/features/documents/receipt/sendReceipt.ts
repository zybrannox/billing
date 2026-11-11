// Sends a receipt to this device's printer the way it's set up in System setup
// → Receipt printer: through the printer driver, or to RawBT on Android.
import type { InvoiceDetail } from "../../billing/invoiceSheetUtils";
import type { DocumentSettings } from "../documentSettings";
import { rawbtLink } from "./escpos";
import { loadPrinterSettings, type PrinterSettings } from "./printerSettings";
import { printReceipt } from "./printReceipt";
import { COLUMNS, invoiceReceipt, type ReceiptLine } from "./receipt";

export function sendReceipt(lines: ReceiptLine[], printer: PrinterSettings) {
  if (printer.route === "rawbt") window.location.href = rawbtLink(lines);
  else printReceipt(lines, printer.paper);
}

export function printInvoiceReceipt(invoice: InvoiceDetail, settings: DocumentSettings) {
  const printer = loadPrinterSettings();
  sendReceipt(invoiceReceipt(invoice, settings, COLUMNS[printer.paper]), printer);
}
