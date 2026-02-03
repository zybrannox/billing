/**
 * Format an ISO datetime string to a readable format
 * @param isoString - ISO 8601 datetime string (e.g., "2026-02-01T14:30:00")
 * @returns Formatted datetime string (e.g., "Feb 1, 2026 2:30 PM")
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";

  try {
    const date = new Date(isoString);

    // Check if date is valid
    if (isNaN(date.getTime())) return isoString;

    // Format: "Feb 1, 2026 2:30 PM"
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return isoString;
  }
}

/**
 * Format an ISO datetime string to just the date
 * @param isoString - ISO 8601 datetime string
 * @returns Formatted date string (e.g., "Feb 1, 2026")
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";

  try {
    const date = new Date(isoString);

    if (isNaN(date.getTime())) return isoString;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return isoString;
  }
}
