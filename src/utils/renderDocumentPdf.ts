import { createRoot } from "react-dom/client";
import type { ReactElement, Ref } from "react";

import { generateInvoicePdf } from "./generateInvoicePdf";
import { useDocumentSettingsStore } from "../store/useDocumentSettingsStore";

// Renders a document component into a detached, off-screen container, turns
// it into a PDF, and tears it down - so a "download" or "share" straight
// from a list card never has to visibly open the document first. It must be
// genuinely laid out and painted (html2canvas can't rasterize display:none),
// so it's positioned off-screen rather than hidden. Fixed width matches the
// on-screen sheet's natural width.
//
// `build` receives the ref to attach to the sheet's root node. The shop's
// branding comes from the settings store, so it (and the logo) is loaded
// first - otherwise the capture would be of the default look.
export async function renderDocumentPdf(
  build: (ref: Ref<HTMLDivElement>) => ReactElement,
  filename: string,
): Promise<File> {
  await useDocumentSettingsStore.getState().load();

  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    top: "0",
    left: "-10000px",
    width: "840px",
    pointerEvents: "none",
  });
  document.body.appendChild(container);

  const root = createRoot(container);
  let node: HTMLDivElement | null = null;

  try {
    await new Promise<void>((resolve) => {
      root.render(
        build((el: HTMLDivElement | null) => {
          node = el;
          if (el) resolve();
        }),
      );
    });
    // A beat for the just-mounted sheet to lay out and its images/fonts to
    // settle. A timer, not requestAnimationFrame: frames don't fire in a
    // backgrounded tab, which would stall this forever.
    await new Promise((resolve) => setTimeout(resolve, 60));

    if (!node) throw new Error("Failed to render the document");
    return await generateInvoicePdf(node, filename);
  } finally {
    root.unmount();
    container.remove();
  }
}
