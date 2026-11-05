// An invoice line's description holds at most this much (see InvoiceItem).
const MAX_DESCRIPTION = 255;
const MAX_LINES = 30;

// Each line of a note becomes a line on the bill, so a note like
//   Flex banner 8x4
//   Name board
// starts the invoice with two rows, ready for sizes and rates.
export const noteToLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim().slice(0, MAX_DESCRIPTION))
    .filter(Boolean)
    .slice(0, MAX_LINES);
