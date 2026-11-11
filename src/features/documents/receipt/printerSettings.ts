// How this device prints receipts. Kept in the browser, not the account: the
// printer is attached to the machine, so each counter keeps its own choice.
import type { PaperWidth } from "./receipt";

export type PrintRoute = "device" | "rawbt";

export interface PrinterSettings {
  paper: PaperWidth;
  route: PrintRoute;
}

const KEY = "receipt-printer";

export const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

export const DEFAULT_PRINTER: PrinterSettings = { paper: 58, route: "device" };

export function loadPrinterSettings(): PrinterSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<PrinterSettings> | null;
    return {
      paper: saved?.paper === 80 ? 80 : 58,
      route: saved?.route === "rawbt" ? "rawbt" : "device",
    };
  } catch {
    return DEFAULT_PRINTER;
  }
}

export function savePrinterSettings(settings: PrinterSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or storage blocked: the choice just isn't remembered.
  }
}
