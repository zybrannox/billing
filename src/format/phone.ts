/**
 * Display form of a phone number, for showing - never for storing or sending.
 * Indian numbers read as "98765 43210" (or "+91 98765 43210" with a country
 * code); anything else is returned as typed, trimmed, so nothing is ever
 * mangled.
 */
export function formatPhone(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";

  const digits = value.replace(/[\s()-]/g, "");
  const national = /^(?:\+?91)?([6-9]\d{9})$/.exec(digits);
  if (!national) return value;

  const local = `${national[1].slice(0, 5)} ${national[1].slice(5)}`;
  return digits.startsWith("+91") || (digits.startsWith("91") && digits.length === 12) ? `+91 ${local}` : local;
}
