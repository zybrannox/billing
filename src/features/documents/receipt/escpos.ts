// Turns receipt lines into ESC/POS, the command language thermal receipt
// printers understand, for printing over Bluetooth without a driver.
import type { ReceiptLine } from "./receipt";

const ESC = 0x1b;
const GS = 0x1d;

// The printer's built-in font has no rupee sign or typographic punctuation.
const REPLACEMENTS: [RegExp, string][] = [
  [/₹/g, "Rs."],
  [/[–—−]/g, "-"],
  [/[‘’]/g, "'"],
  [/[“”]/g, '"'],
  [/…/g, "..."],
  [/×/g, "x"],
  [/\u00a0/g, " "],
];

/** Plain ASCII the printer can draw; anything else becomes "?". */
export function toPrinterText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement);
  return out.replace(/[^\x20-\x7e]/g, "?");
}

export function toEscPos(lines: ReceiptLine[], { feedLines = 4 }: { feedLines?: number } = {}): Uint8Array {
  const bytes: number[] = [ESC, 0x40]; // reset
  for (const line of lines) {
    bytes.push(ESC, 0x61, line.align === "center" ? 1 : 0);
    bytes.push(ESC, 0x45, line.bold ? 1 : 0);
    bytes.push(GS, 0x21, line.big ? 0x11 : 0x00);
    for (const ch of toPrinterText(line.text)) bytes.push(ch.charCodeAt(0));
    bytes.push(0x0a);
  }
  bytes.push(ESC, 0x61, 0, ESC, 0x45, 0, GS, 0x21, 0);
  // Room to tear the paper off past the cutter edge.
  bytes.push(ESC, 0x64, feedLines);
  return Uint8Array.from(bytes);
}

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

/**
 * A link that hands the receipt to the RawBT app on Android, which prints it
 * on a paired Bluetooth (or USB) printer. Opens the Play Store if it isn't installed.
 */
export function rawbtLink(lines: ReceiptLine[]): string {
  return `intent:base64,${toBase64(toEscPos(lines))}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}
