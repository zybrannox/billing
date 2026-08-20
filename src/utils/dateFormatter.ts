const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Format an ISO datetime string to a readable format
 * @param isoString - ISO 8601 datetime string (e.g., "2026-02-01T14:30:00")
 * @returns Formatted datetime string (e.g., "Feb 1, 2026, 2:30 PM"), or
 * "Today"/"Yesterday" in place of the date for values that land on those
 * calendar days (compared in the viewer's local time, same as the time
 * portion itself, so a value close to midnight doesn't say "Today" while
 * displaying yesterday's date right next to it).
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";

  try {
    const date = new Date(isoString);

    // Check if date is valid
    if (isNaN(date.getTime())) return isoString;

    const time = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const now = new Date();
    if (isSameCalendarDay(date, now)) return `Today, ${time}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameCalendarDay(date, yesterday)) return `Yesterday, ${time}`;

    // Format: "Feb 1, 2026, 2:30 PM"
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
