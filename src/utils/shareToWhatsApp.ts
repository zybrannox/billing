// wa.me is WhatsApp's own official share link - opens WhatsApp Web/Desktop
// (or the mobile app, if this runs there) with `text` pre-filled in the
// chat composer, no contact required first. This is what actually works
// everywhere: navigator.share() (the Web Share API) only lists WhatsApp
// as a target when the OS itself has it registered as a share handler,
// which desktop WhatsApp normally doesn't do - so on most desktop
// browsers the native share sheet simply never offers WhatsApp at all.
// wa.me sidesteps that by not depending on OS share-sheet registration.
export function shareToWhatsApp(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// For flows that need to do async work first (uploading the generated PDF
// to get back a shareable link - see InvoiceView.tsx/QuotationView.tsx's
// handleShareWhatsApp) before the final wa.me text is known.
//
// Calling shareToWhatsApp only once that work finishes gets silently
// popup-blocked: window.open() is only exempt from the blocker while
// still inside the original click's "user activation" window, which a
// browser considers spent once an async gap (an upload, a PDF render) has
// passed. This opens a blank tab immediately instead - still inside that
// window - and redirects *that* tab to the real wa.me URL once
// `buildText` resolves, which browsers do allow regardless of timing.
export async function shareToWhatsAppAfter(buildText: () => Promise<string>) {
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    try {
      tab.document.title = "Preparing WhatsApp share...";
      Object.assign(tab.document.body.style, {
        font: "14px system-ui, sans-serif",
        color: "#667085",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        margin: "0",
      });
      tab.document.body.textContent = "Preparing your WhatsApp message...";
    } catch {
      // Harmless if this fails for any reason - the blank tab just stays
      // blank for a moment until the redirect below.
    }
  }

  try {
    const text = await buildText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (tab && !tab.closed) {
      // Severs the child tab's back-reference to this page before handing
      // it off to an external site (wa.me) - the same protection a plain
      // <a target="_blank" rel="noopener"> gets, which window.open's own
      // "noopener" feature can't give us here since that would also drop
      // our own reference to the tab, and we need that reference to
      // redirect it once the link is ready.
      try {
        tab.opener = null;
      } catch {
        // Some browsers don't allow this assignment - non-fatal, just
        // means the mitigation doesn't apply this time.
      }
      tab.location.href = url;
    } else {
      // Popup was blocked (or closed) despite opening synchronously -
      // fall back to a plain, immediate open attempt.
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (err) {
    tab?.close();
    throw err;
  }
}
