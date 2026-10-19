// Money formatting - the single implementation every screen and document uses.
// Always the Indian locale (en-IN: 1,00,000 not 100,000) and always explicit,
// so output never depends on the viewer's browser settings.

const LOCALE = "en-IN";
export const CURRENCY_SYMBOL = "₹";

type Digits = { minimumFractionDigits?: number; maximumFractionDigits: number };

const WHOLE: Digits = { maximumFractionDigits: 0 };
const FIXED: Digits = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const AUTO: Digits = { maximumFractionDigits: 2 };

const withSymbol = (value: number, digits: Digits) =>
  // U+2212 minus, matching how the app already shows deductions.
  `${value < 0 ? "−" : ""}${CURRENCY_SYMBOL}${Math.abs(value).toLocaleString(LOCALE, digits)}`;

/** ₹1,235 - for lists and summaries, where paise are noise. */
export const formatRupeesWhole = (value: number) => withSymbol(value, WHOLE);

/** ₹1,234.5 / ₹1,234.56 - up to two decimals, none when whole. For amounts a person types or reads closely. */
export const formatRupees = (value: number) => withSymbol(value, AUTO);

/** ₹1,234.50 - always two decimals. For totals on invoices and quotations. */
export const formatRupeesFixed = (value: number) => withSymbol(value, FIXED);

/** 1,234.5 - up to two decimals, no symbol. For a rate quoted inside a sentence. */
export const formatPlain = (value: number) => value.toLocaleString(LOCALE, AUTO);

/** 1,234.50 - two decimals, no symbol. For table columns in printed documents. */
export const formatAmount = (value: number) => value.toLocaleString(LOCALE, FIXED);

/** INR 1,234.50 - the printed documents' total style. */
export const formatInr = (value: number) => `INR ${formatAmount(value)}`;
