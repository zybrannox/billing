import { useRef, useState, type KeyboardEvent } from "react";
import { useSearchShortcut } from "../hooks/useSearchShortcut";
import SearchInput from "./SearchInput";

interface TableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sx?: object;
  // "/" jumps here and Esc clears and leaves, with a reminder at the right of the box.
  shortcuts?: boolean;
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
  shortcuts = false,
}: TableSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useSearchShortcut(inputRef, shortcuts);

  return (
    <SearchInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ minWidth: 220, ...sx }}
      {...(shortcuts && {
        inputRef,
        shortcutHint: focused ? "Esc" : "/",
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key !== "Escape") return;
          if (value) onChange("");
          inputRef.current?.blur();
        },
      })}
    />
  );
}
