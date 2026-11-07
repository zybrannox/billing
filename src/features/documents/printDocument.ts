import { planPdfPages } from "./pdfPages";

const ROOT_ID = "document-print-root";
const STYLE_ID = "document-print-style";

// A4 less the white space kept around the document, in CSS pixels (96 per inch).
const PAGE_MARGIN_MM = 12;
const mmToPx = (mm: number) => (mm * 96) / 25.4;
const CONTENT_HEIGHT_PX = mmToPx(297 - PAGE_MARGIN_MM * 2);

const FIT_SAFETY = 0.97;

// The page itself has no margin: Chrome and Edge print their date, title, address
// and page number in the margin, so with none there's nowhere for them to go. The
// white space comes back as table header and footer rows instead, which the browser
// repeats at the top and bottom of every sheet, and as padding at the sides.
const STYLES = `
  #${ROOT_ID} { position: absolute; left: -10000px; top: 0; width: 210mm; }
  #${ROOT_ID} table { width: 100%; border-collapse: collapse; }
  #${ROOT_ID} td { padding: 0 ${PAGE_MARGIN_MM}mm; }
  #${ROOT_ID} .print-spacer { height: ${PAGE_MARGIN_MM}mm; }
  @media print {
    @page { size: A4; margin: 0; }
    html, body { height: auto !important; overflow: visible !important; margin: 0 !important; }
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

const spacerRow = (group: "thead" | "tfoot") => {
  const section = document.createElement(group);
  section.innerHTML = '<tr><td><div class="print-spacer"></div></td></tr>';
  return section;
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

  const body = document.createElement("tbody");
  body.insertRow().insertCell().append(copy);
  const table = document.createElement("table");
  table.append(spacerRow("thead"), body, spacerRow("tfoot"));

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.append(table);
  // The style goes last so its page size wins over the views' own print rules.
  document.body.append(root, style);

  // Shrunk slightly further than the exact fit, so a rounding difference between
  // browsers and printers can't push the last line onto a second sheet.
  const { scale } = planPdfPages(copy.scrollHeight, CONTENT_HEIGHT_PX, []);
  if (scale < 1) copy.style.setProperty("zoom", String(scale * FIT_SAFETY));

  window.addEventListener("afterprint", removePrintCopy, { once: true });
  window.print();
}
