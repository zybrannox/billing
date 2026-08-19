import SearchInput from "../../ui/SearchInput";

interface TableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sx?: object;
}

/**
 * Reusable search box for filtering a table's rows (see useTableSearch).
 * Drop this next to any Table instance to add search.
 */
export default function TableSearchBar({
  value,
  onChange,
  placeholder = "Search...",
  sx,
}: TableSearchBarProps) {
  return (
    <SearchInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ minWidth: 220, ...sx }}
    />
  );
}
