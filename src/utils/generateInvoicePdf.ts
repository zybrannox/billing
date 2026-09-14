import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Renders a DOM node (the printable invoice sheet) to a single-page-per-
// screen-height PDF, image-based rather than real PDF text - the simplest
// approach that guarantees the PDF looks exactly like what's on screen
// (same fonts, layout, colors) without maintaining a second, separate
// "PDF template" of the invoice that could drift from the real one. A
// scale of 2 keeps the rendered text crisp instead of blurry at normal
// screen resolution.
export async function generateInvoicePdf(node: HTMLElement, filename: string): Promise<File> {
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  // A4 in points (jsPDF's default unit). A real page margin on every side -
  // drawing the capture edge-to-edge (the previous behavior) read as a
  // screenshotted web card pasted onto a page, not a printed document.
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 28; // ~10mm
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // The capture is `scale: 2`, so this converts one page's content-box
  // height (in PDF points) into the matching number of source-canvas
  // pixels, telling us how many canvas rows fit on one page.
  const pxPerPt = canvas.width / contentWidth;
  const pageSliceHeightPx = Math.max(1, Math.floor(contentHeight * pxPerPt));

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  let renderedPx = 0;
  let firstPage = true;

  while (renderedPx < canvas.height) {
    const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - renderedPx);

    // A real crop (drawImage with source offsets), not a stretch - addImage
    // always stretches whatever width/height it's given to fill, so tiling
    // pages by feeding it ever-larger negative y offsets (the previous
    // approach) only works when there's no margin for jsPDF's own page
    // clip to respect. Slicing the canvas ourselves lets every page keep
    // its own margin box.
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0, renderedPx, canvas.width, sliceHeightPx,
      0, 0, canvas.width, sliceHeightPx
    );

    if (!firstPage) pdf.addPage();
    firstPage = false;

    const sliceHeightPt = sliceHeightPx / pxPerPt;
    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentWidth, sliceHeightPt);

    renderedPx += sliceHeightPx;
  }

  const blob = pdf.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}
