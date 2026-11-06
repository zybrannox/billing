import { useEffect, type RefObject } from "react";

// Only when nothing else wants the key: not while typing, holding a modifier
// (browser shortcuts stay theirs) or working in a dialog.
export const shouldFocusSearch = (
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "target">,
  dialogOpen: boolean,
) => {
  if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || dialogOpen) return false;
  const target = event.target as Partial<HTMLElement> | null;
  return !(target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? ""));
};

// Press "/" anywhere on the page to jump to this search box.
export function useSearchShortcut(inputRef: RefObject<HTMLInputElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldFocusSearch(event, !!document.querySelector('[role="dialog"]'))) return;
      event.preventDefault();
      // The table underneath would otherwise treat the key as starting a cell edit.
      event.stopPropagation();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [inputRef, enabled]);
}
