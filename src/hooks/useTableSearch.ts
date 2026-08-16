import { useMemo, useState } from "react";

/**
 * Generic client-side search/filter for table rows. Case-insensitive
 * substring match across the given keys (or every key on the row if
 * none are given).
 */
export function useTableSearch<T extends Record<string, any>>(
  rows: T[],
  keys?: (keyof T)[],
) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    const searchKeys = keys ?? ((rows[0] ? Object.keys(rows[0]) : []) as (keyof T)[]);

    return rows.filter((row) =>
      searchKeys.some((key) => {
        const value = row[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(q);
      }),
    );
  }, [rows, query, keys]);

  return { query, setQuery, filteredRows };
}
