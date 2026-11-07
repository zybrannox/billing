import { planPdfPages } from "./pdfPages";

const ROOT_ID = "document-print-root";
const STYLE_ID = "document-print-style";

// A4 less the margins below, in CSS pixels (96 per inch).
const PAGE_MARGIN_MM = 12;
const mmToPx = (mm: number) => (mm * 96) / 25.4;
const CONTENT_WIDTH_PX = mmToPx(210 - PAGE_MARGIN_MM * 2);
const CONTENT_HEIGHT_PX = mmToPx(297 - PAGE_MARGIN_MM * 2);

const FIT_SAFETY = 0.97;

const STYLES = `
  #${ROOT_ID} { position: absolute; left: -10000px; top: 0; width: ${CONTENT_WIDTH_PX}px; }
  @media print {
    @page { size: A4; margin: ${PAGE_MARGIN_MM}mm; }
    html, body { height: auto !important; overflow: visible !important; }
    body > *:not(#${ROOT_ID}) { display: none !important; }
    #${ROOT_ID} { position: static; width: auto; }
    #${ROOT_ID}, #${ROOT_ID} * { visibility: visible !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    #${ROOT_ID} .invoice-row { break-inside: avoid; }
  }
`;

const removePrintCopy = () => {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
};

// Prints one document through the browser, on whichever printer this computer uses.
// It prints a copy placed directly on the page, because where the document normally
// sits (a scrolling dialog or panel) cuts it off at the first page. A slight overflow
// shrinks onto one sheet and a long document breaks between rows, same as its PDF.
export function printDocument(sheet: HTMLElement) {
  removePrintCopy();

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;

  const copy = sheet.cloneNode(true) as HTMLElement;
  // The views' own print rules pin .invoice-sheet in place, which stops it at one page.
  copy.classList.remove("invoice-sheet");
  Object.assign(copy.style, {
    position: "static",
    width: "100%",
    maxWidth: "none",
    margin: "0 auto",
    transform: "none",
    boxShadow: "none",
    border: "none",
    borderRadius: "0",
  });
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.append(copy);
  // The style goes last so its page size wins over the views' own print rules.
  document.body.append(root, style);

  // Shrunk slightly further than the exact fit, so a rounding difference between
  // browsers and printers can't push the last line onto a second sheet.
  const { scale } = planPdfPages(copy.scrollHeight, CONTENT_HEIGHT_PX, []);
  if (scale < 1) copy.style.setProperty("zoom", String(scale * FIT_SAFETY));

  window.addEventListener("afterprint", removePrintCopy, { once: true });
  window.print();
}
