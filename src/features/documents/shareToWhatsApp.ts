import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";

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

// For flows that need to do async work first (generating and uploading a
// PDF to get back a shareable link - see InvoiceView.tsx/QuotationView.tsx's
// handleShareWhatsApp) before the final wa.me text is known.
//
// The work runs FIRST, with this app's tab still in front, and WhatsApp is
// opened only once the text is ready. The earlier design opened a blank tab
// up front (to stay inside the click's popup-permission window) and
// redirected it later - but that put the new tab in front and this one in
// the background while the PDF was being rendered, and browsers pause
// animation frames and clamp timers in background tabs, which is exactly
// what rendering a PDF leans on: a share could take many seconds, or wait
// until the user switched back.
//
// Opening after the work normally still counts as the user's click (Chrome
// and Firefox allow ~5 s of "transient activation"). If a stricter browser
// blocks it anyway, a dialog offers an "Open WhatsApp" button instead - a
// fresh click, so it can't be blocked - rather than the share just failing.
export async function shareToWhatsAppAfter(buildText: () => Promise<string>) {
  const text = await buildText();
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;

  const tab = window.open(url, "_blank");
  if (tab) {
    // Same protection a plain <a target="_blank" rel="noopener"> gets,
    // applied after the fact since the tab reference is needed to detect a
    // blocked popup (the "noopener" feature would make open() return null
    // even on success).
    try {
      tab.opener = null;
    } catch {
      // Some browsers don't allow this assignment - non-fatal.
    }
    return;
  }

  useConfirmDialogStore.getState().showDialog({
    title: "Open WhatsApp",
    description: "Your browser blocked the new tab. Click below to open the message in WhatsApp.",
    confirmText: "Open WhatsApp",
    cancelText: "Close",
    onConfirm: () => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });
}
