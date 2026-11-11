// Prints receipt lines through the browser, on the printer this device has
// installed (USB, or Bluetooth paired with the computer). The page is sized
// to the roll and to the receipt's length, so no paper is wasted.
import { COLUMNS, type PaperWidth, type ReceiptLine } from "./receipt";

const ROOT_ID = "receipt-print-root";
const STYLE_ID = "receipt-print-style";

/** The width the print head actually reaches: 48 mm of a 58 mm roll, 72 mm of an 80 mm one. */
export const PRINTABLE_MM: Record<PaperWidth, number> = { 58: 48, 80: 72 };

// A monospace character is 0.6 of the font size wide, so this fills the
// printable width with exactly the printer's own number of characters.
export const fontSizeMm = (paper: PaperWidth) => PRINTABLE_MM[paper] / (COLUMNS[paper] * 0.6);

const MM_PER_PX = 25.4 / 96;

/** The receipt as HTML elements, shared by the on-screen preview and the printout. */
export function receiptElement(lines: ReceiptLine[], paper: PaperWidth): HTMLElement {
  const sheet = document.createElement("div");
  const size = fontSizeMm(paper);
  Object.assign(sheet.style, {
    width: `${PRINTABLE_MM[paper]}mm`,
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: `${size}mm`,
    lineHeight: "1.25",
    color: "black",
    background: "white",
  });
  for (const line of lines) {
    const div = document.createElement("div");
    div.textContent = line.text || " ";
    Object.assign(div.style, {
      whiteSpace: "pre",
      textAlign: line.align === "center" ? "center" : "left",
      fontWeight: line.bold ? "700" : "400",
      fontSize: line.big ? `${size * 2}mm` : "inherit",
      overflow: "hidden",
    });
    sheet.append(div);
  }
  return sheet;
}

const remove = () => {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
};

export function printReceipt(lines: ReceiptLine[], paper: PaperWidth) {
  remove();
  const root = document.createElement("div");
  root.id = ROOT_ID;
  const sheet = receiptElement(lines, paper);
  // Centred on the roll, with a little paper after the last line to tear off.
  Object.assign(sheet.style, { margin: "0 auto", paddingBottom: "8mm" });
  root.append(sheet);
  Object.assign(root.style, { position: "absolute", left: "-10000px", top: "0", width: `${paper}mm` });
  document.body.append(root);

  const heightMm = Math.ceil(sheet.getBoundingClientRect().height * MM_PER_PX) + 2;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      @page { size: ${paper}mm ${heightMm}mm; margin: 0; }
      html, body { width: ${paper}mm; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
      body > *:not(#${ROOT_ID}) { display: none !important; }
      #${ROOT_ID} { position: static !important; width: ${paper}mm !important; }
      #${ROOT_ID}, #${ROOT_ID} * { visibility: visible !important; color: black !important; }
    }
  `;
  document.body.append(style);
  window.addEventListener("afterprint", remove, { once: true });
  window.print();
}
