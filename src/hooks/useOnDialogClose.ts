import { useEffect, useRef } from "react";
import { useDialogStore } from "../store/useDialogStore";

// Runs `callback` each time the global dialog (see store/useDialogStore)
// goes from open to closed. AdminLayout uses it once to invalidate the
// billing queries (see features/billing/queries.ts), so lists behind a
// record dialog pick up whatever the dialog changed without the dialog and
// the list having to know about each other.
export function useOnDialogClose(callback: () => void) {
  const isOpen = useDialogStore((s) => s.isDialogOpen);
  const wasOpen = useRef(false);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (wasOpen.current && !isOpen) latest.current();
    wasOpen.current = isOpen;
  }, [isOpen]);
}
