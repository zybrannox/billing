// How a rendered document is laid onto A4 pages, in pixels of the rendered image.

// An invoice a little over one page reads better shrunk onto one sheet than with
// its total alone on a second. Past this, the text would get too small to read.
const MAX_SHRINK_TO_ONE_PAGE = 1.35;

export interface PdfPagePlan {
  // Fraction of the full page size to draw at; below 1 only when shrunk onto one page.
  scale: number;
  slices: { start: number; end: number }[];
}

// `breaks` are the heights it's safe to start a new page at (the top of a table
// row, say), so a page never ends partway through one.
export function planPdfPages(contentHeight: number, pageHeight: number, breaks: number[]): PdfPagePlan {
  if (contentHeight <= pageHeight * MAX_SHRINK_TO_ONE_PAGE) {
    return { scale: Math.min(1, pageHeight / contentHeight), slices: [{ start: 0, end: contentHeight }] };
  }

  const slices = [];
  let start = 0;
  while (start < contentHeight) {
    const limit = start + pageHeight;
    if (limit >= contentHeight) {
      slices.push({ start, end: contentHeight });
      break;
    }
    // Nothing safe on this page (one enormous row) falls back to cutting at the limit.
    const end = Math.max(...breaks.filter((at) => at > start && at <= limit), 0) || limit;
    slices.push({ start, end });
    start = end;
  }
  return { scale: 1, slices };
}
