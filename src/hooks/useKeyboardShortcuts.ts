import { useEffect, useRef } from "react";

type KeyHandlerMap = Record<string, () => void>;

/**
 * Wires a map of key -> handler to a single window keydown listener, active
 * only while `enabled` is true - e.g. only while a specific dialog/lightbox
 * is open, rather than globally for the whole page. Reusable anywhere a
 * screen needs scoped keyboard shortcuts instead of hand-rolling its own
 * useEffect + addEventListener.
 *
 * Handlers are read through a ref so the listener itself is only
 * added/removed when `enabled` changes, not on every render (an inline
 * object literal for `handlers` would otherwise be a new reference every
 * render).
 */
export function useKeyboardShortcuts(
  handlers: KeyHandlerMap,
  enabled: boolean = true,
) {
  const handlersRef = useRef(handlers);

  // Keeps the ref fresh after every render, same effect as writing it
  // inline during render used to have - but a render can be discarded/
  // retried without committing, so mutating a ref as a render side effect
  // is unsafe under React's own rules (react-hooks/refs). No dependency
  // array: this should run after every commit, not just when `enabled`
  // changes, so a handler map that changes without `enabled` changing
  // (e.g. a value the handler closes over updates) is still picked up.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack typing in a text field elsewhere on the page.
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      const handler = handlersRef.current[e.key];
      if (!handler) return;

      e.preventDefault();
      handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
